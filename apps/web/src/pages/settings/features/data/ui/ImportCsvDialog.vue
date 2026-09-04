<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { DownloadIcon, FileUpIcon } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { ResponsiveDialog } from '@/shared/ui/responsive-dialog'
import { DialogClose, DialogFooter } from '@/shared/ui/dialog'
import { Checkbox } from '@/shared/ui/checkbox'
import { formatMoney, DEFAULT_CURRENCY } from '@/shared/lib/money'
import { useAccounts } from '@/entities/account'
import {
  DEFAULT_CATEGORY_ICON,
  pickCategoryColor,
  useCategoriesIncludingArchived,
  useCreateCategory,
} from '@/entities/category'
import { useCreateTransaction, type CashflowTransaction } from '@/entities/transaction'
import { RepositoryError } from '@/shared/lib/data'
import { notification } from '@/shared/services/notification'
import { downloadTextFile } from '@/features/export-csv'
import {
  parseImportCsv,
  type ParsedImportRow,
  type ValidImportRow,
} from '../model/parse-import-csv'
import { IMPORT_TEMPLATE_CSV } from '../model/template'

// CSV import wizard (web-data-transfer): pick file → preview (per-row
// outcomes, categories to create, per-row exclude) → commit → result
// counts. Writes go through the standard composables, so every row lands in
// the local mirror + outbox and syncs after login; deterministic ids make
// re-imports skip instead of duplicating.

const open = defineModel<boolean>('open', { default: false })

const { t, locale } = useI18n()
const { data: accounts } = useAccounts()
const { data: existingCategories } = useCategoriesIncludingArchived()
const { mutateAsync: createCategory } = useCreateCategory()
const { mutateAsync: createTransaction } = useCreateTransaction<CashflowTransaction>()

type Stage = 'pick' | 'preview' | 'result'
const stage = ref<Stage>('pick')
const fileName = ref('')
const rows = ref<ParsedImportRow[]>([])
const headerError = ref<string | null>(null)
/** 1-based lines the user unchecked in the preview. */
const excluded = ref(new Set<number>())
const isCommitting = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const validRows = computed(() =>
  rows.value.filter((row): row is ValidImportRow => row.status === 'valid'),
)
const invalidRows = computed(() => rows.value.filter((row) => row.status === 'invalid'))
const includedRows = computed(() => validRows.value.filter((row) => !excluded.value.has(row.line)))

/** Category names (case-insensitive) that don't exist yet, with the type
 * the file uses them under — created on commit before the rows. */
const categoriesToCreate = computed(() => {
  const existing = new Set(
    (existingCategories.value ?? []).map((category) => category.name.toLowerCase()),
  )
  const toCreate = new Map<string, { name: string; direction: ValidImportRow['direction'] }>()
  for (const row of includedRows.value) {
    const key = row.categoryName.toLowerCase()
    if (!existing.has(key) && !toCreate.has(key)) {
      toCreate.set(key, { name: row.categoryName, direction: row.direction })
    }
  }
  return [...toCreate.values()]
})

const reset = () => {
  stage.value = 'pick'
  fileName.value = ''
  rows.value = []
  headerError.value = null
  excluded.value = new Set<number>()
  isCommitting.value = false
}

watch(open, (isOpen) => {
  if (isOpen) reset()
})

const errorLabel = (code: string): string => {
  switch (code) {
    case 'missing-columns':
      return t('dataTransfer.errors.missing-columns')
    case 'bad-type':
      return t('dataTransfer.errors.bad-type')
    case 'bad-date':
      return t('dataTransfer.errors.bad-date')
    case 'bad-amount':
      return t('dataTransfer.errors.bad-amount')
    case 'empty-category':
      return t('dataTransfer.errors.empty-category')
    case 'unknown-account':
      return t('dataTransfer.errors.unknown-account')
    case 'category-conflict':
      return t('dataTransfer.errors.category-conflict')
    default:
      return t('dataTransfer.errors.empty-file')
  }
}

const typeLabel = (direction: ValidImportRow['direction']) =>
  direction === 'income' ? t('dataTransfer.types.income') : t('dataTransfer.types.expense')

const formatAmount = (minor: number) => formatMoney(minor, DEFAULT_CURRENCY, locale.value)
const formatDay = (iso: string) => iso.slice(0, 10).split('-').reverse().join('.')

const downloadTemplate = () => {
  downloadTextFile('import_template.csv', IMPORT_TEMPLATE_CSV)
}

const onFileChosen = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  try {
    const text = await file.text()
    const result = await parseImportCsv(text, { accounts: accounts.value ?? [] })
    if (result.headerError) {
      headerError.value = result.headerError
      rows.value = []
      return
    }
    fileName.value = file.name
    rows.value = result.rows
    stage.value = 'preview'
  } catch {
    headerError.value = 'empty-file'
  }
}

const importCounts = ref({ created: 0, skipped: 0, failed: 0 })

const commit = async () => {
  isCommitting.value = true
  try {
    // 1. Create the missing categories first so every row has a valid ref.
    const nameToId = new Map<string, string>()
    const takenColors = (existingCategories.value ?? []).map((category) => category.color)
    for (const category of categoriesToCreate.value) {
      try {
        const created = await createCategory({
          name: category.name,
          type: category.direction,
          icon: DEFAULT_CATEGORY_ICON.icon,
          color: pickCategoryColor(DEFAULT_CATEGORY_ICON.icon, takenColors),
        })
        nameToId.set(category.name.toLowerCase(), created.id)
      } catch {
        // A concurrent creation may have raced us; the row step below will
        // surface a hard failure if the reference really is broken.
      }
    }
    for (const category of existingCategories.value ?? []) {
      nameToId.set(category.name.toLowerCase(), category.id)
    }

    // 2. Rows: deterministic id -> TRANSACTION_ALREADY_EXISTS means the row
    // was imported before and is skipped, never duplicated.
    let created = 0
    let skipped = 0
    let failed = 0
    for (const row of includedRows.value) {
      try {
        await createTransaction({
          id: row.id,
          type: row.direction,
          amount: row.amountMinor,
          description: row.note,
          accountId: row.accountId,
          categoryId: nameToId.get(row.categoryName.toLowerCase())!,
          occurredAt: row.occurredAt,
        })
        created++
      } catch (error) {
        // The worker bridge rehydrates the coarse class but drops `apiCode`,
        // so the skip check switches on `code`, not the api code.
        if (error instanceof RepositoryError && error.code === 'already-exists') {
          skipped++
        } else {
          failed++
        }
      }
    }
    importCounts.value = { created, skipped, failed }
    stage.value = 'result'
    notification.success(t('dataTransfer.importDone'))
  } finally {
    isCommitting.value = false
  }
}
</script>

<template>
  <!-- Wide on desktop: the 7-column preview needs the room; capped height
       with the shell's scrolling body so tall content never clips off-screen. -->
  <ResponsiveDialog v-model:open="open" class="max-h-[calc(100dvh-4rem)] w-full sm:max-w-4xl">
    <template #title>{{ t('dataTransfer.dialog.title') }}</template>
    <template #description>
      {{ t('dataTransfer.dialog.pickDescription') }}
    </template>

    <!-- Stage 1: pick the file (or download the template). -->
    <div v-if="stage === 'pick'" class="flex flex-col gap-4">
      <p v-if="headerError" class="text-sm text-destructive" data-testid="import-header-error">
        {{ errorLabel(headerError) }}
      </p>
      <div class="flex flex-col gap-2 sm:flex-row">
        <input
          ref="fileInput"
          type="file"
          accept=".csv,text/csv"
          class="sr-only"
          data-testid="import-file-input"
          @change="onFileChosen"
        />
        <Button data-testid="import-choose-file" @click="fileInput?.click()">
          <FileUpIcon class="size-4" />
          {{ t('dataTransfer.dialog.chooseFile') }}
        </Button>
        <Button variant="outline" data-testid="import-download-template" @click="downloadTemplate">
          <DownloadIcon class="size-4" />
          {{ t('dataTransfer.templateButton') }}
        </Button>
      </div>
    </div>

    <!-- Stage 2: preview. min-w-0 through the chain: the dialog content is a
         grid (min-width auto would let the table's min-content blow the
         track past the card), so every level must be shrinkable and the
         table scrolls INSIDE its own bordered box. -->
    <div v-else-if="stage === 'preview'" class="flex min-w-0 flex-col gap-4">
      <p class="text-sm text-muted-foreground">{{ fileName }}</p>
      <div class="flex flex-wrap gap-2 text-sm">
        <span class="font-medium">
          {{ t('dataTransfer.dialog.previewValid', { count: validRows.length }) }}
        </span>
        <span v-if="invalidRows.length" class="text-destructive">
          {{ t('dataTransfer.dialog.previewInvalid', { count: invalidRows.length }) }}
        </span>
      </div>

      <div
        v-if="categoriesToCreate.length"
        class="min-w-0 rounded-lg bg-muted/50 p-3 text-sm [&_p]:break-words"
      >
        <p class="font-medium">{{ t('dataTransfer.dialog.willCreateCategories') }}</p>
        <p class="mt-1 text-muted-foreground">
          {{ categoriesToCreate.map((category) => category.name).join(', ') }}
        </p>
      </div>

      <!-- min-w on the table: on drawer widths the fixed columns alone
           exceed the viewport, and table-fixed would collapse the two
           flexible columns (category/note) to zero width — a floor keeps
           them alive and the box scrolls horizontally instead. -->
      <div
        class="max-h-80 min-w-0 overflow-auto rounded-lg border"
        data-testid="import-table-scroll"
      >
        <!-- Auto layout (no table-fixed): columns never shrink below their
             content, so no fixed-width collapse on drawer widths; the box
             scrolls horizontally when the content wants more room. -->
        <table class="w-full min-w-[592px] text-left text-sm">
          <colgroup>
            <col class="w-9" />
            <col class="w-[88px]" />
            <col class="w-[76px]" />
            <col />
            <col class="w-[92px]" />
            <col class="w-[92px]" />
            <col class="w-[110px]" />
          </colgroup>
          <thead
            class="text-left text-xs uppercase tracking-wide whitespace-nowrap text-muted-foreground"
          >
            <tr>
              <th class="sticky top-0 z-10 border-b border-border bg-background p-2">
                <span class="sr-only">{{ t('dataTransfer.dialog.includeLabel') }}</span>
              </th>
              <th class="sticky top-0 z-10 border-b border-border bg-background p-2">
                {{ t('dataTransfer.dialog.columnDate') }}
              </th>
              <th class="sticky top-0 z-10 border-b border-border bg-background p-2">
                {{ t('dataTransfer.dialog.columnType') }}
              </th>
              <th class="sticky top-0 z-10 border-b border-border bg-background p-2">
                {{ t('dataTransfer.dialog.columnCategory') }}
              </th>
              <th class="sticky top-0 z-10 border-b border-border bg-background p-2">
                {{ t('dataTransfer.dialog.columnAccount') }}
              </th>
              <th class="sticky top-0 z-10 border-b border-border bg-background p-2 text-right">
                {{ t('dataTransfer.dialog.columnAmount') }}
              </th>
              <th class="sticky top-0 z-10 border-b border-border bg-background p-2">
                {{ t('dataTransfer.dialog.columnStatus') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="row in rows" :key="row.line" :data-testid="`import-row-${row.line}`">
              <template v-if="row.status === 'valid'">
                <td class="p-2 align-middle">
                  <Checkbox
                    :model-value="!excluded.has(row.line)"
                    :aria-label="t('dataTransfer.dialog.includeLabel')"
                    @update:model-value="
                      (checked) => {
                        const next = new Set(excluded)
                        if (checked) next.delete(row.line)
                        else next.add(row.line)
                        excluded = next
                      }
                    "
                  />
                </td>
                <td class="p-2 whitespace-nowrap">{{ formatDay(row.occurredAt) }}</td>
                <td class="p-2">{{ typeLabel(row.direction) }}</td>
                <td class="p-2">
                  <span class="block truncate" :title="row.categoryName">{{
                    row.categoryName
                  }}</span>
                </td>
                <td class="p-2">
                  <span class="block truncate" :title="row.accountName ?? undefined">
                    {{ row.accountName ?? t('accounts.noAccount') }}
                  </span>
                </td>
                <td class="p-2 text-right whitespace-nowrap">
                  {{ formatAmount(row.amountMinor) }}
                </td>
                <td class="p-2">
                  <!-- Empty notes render a dash: an all-empty last column
                       reads as a rendering glitch, not as data. -->
                  <span v-if="row.note" class="block truncate" :title="row.note">{{
                    row.note
                  }}</span>
                  <span v-else class="text-muted-foreground">{{
                    t('dataTransfer.dialog.emptyNote')
                  }}</span>
                </td>
              </template>
              <template v-else>
                <td class="p-2 text-muted-foreground">{{ row.line }}</td>
                <td class="p-2 text-destructive" colspan="6">{{ errorLabel(row.code) }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Stage 3: result. -->
    <div v-else class="flex flex-col gap-2 text-sm">
      <p>{{ t('dataTransfer.dialog.resultCreated', { count: importCounts.created }) }}</p>
      <p>{{ t('dataTransfer.dialog.resultSkipped', { count: importCounts.skipped }) }}</p>
      <p v-if="importCounts.failed" class="text-destructive">
        {{ t('dataTransfer.dialog.resultFailed', { count: importCounts.failed }) }}
      </p>
    </div>

    <template #footer>
      <!-- Layout only: the hairline above the band comes from the shell
           (borderedFooter), full-bleed like every other dialog footer. -->
      <DialogFooter class="flex-col gap-3 sm:flex-row">
        <Button
          v-if="stage === 'preview'"
          variant="secondary"
          class="w-full sm:flex-1"
          @click="reset"
        >
          {{ t('dataTransfer.dialog.back') }}
        </Button>
        <Button
          v-if="stage === 'preview'"
          class="w-full sm:flex-1"
          :disabled="!includedRows.length || isCommitting"
          :loading="isCommitting"
          data-testid="import-commit"
          @click="commit"
        >
          {{ t('dataTransfer.dialog.commit', { count: includedRows.length }) }}
        </Button>
        <DialogClose as-child>
          <Button v-if="stage !== 'preview'" variant="secondary" class="w-full sm:flex-1">
            {{ t('dataTransfer.dialog.done') }}
          </Button>
        </DialogClose>
      </DialogFooter>
    </template>
  </ResponsiveDialog>
</template>
