<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQueryCache } from '@pinia/colada'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { ResponsiveDialog } from '@/shared/ui/responsive-dialog'
import { Field, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { notification } from '@/shared/services/notification'
import { VersionConflictError } from '@expense-tracker/api'
import {
  CATEGORY_ICONS,
  pickCategoryColor,
  useCategoriesIncludingArchived,
  useUpdateCategory,
} from '@/entities/category'
import { CategoryAvatar } from '@/shared/ui/category-avatar'
import type { Category } from '@expense-tracker/api'

// Edit dialog (category-management screens): name + the pre-paired
// icon/color set only - the type is immutable by contract and rendered as a
// read-only badge. Mirrors the create dialog's picker model (the user picks
// only the emoji; the color travels with it).
const { t } = useI18n()
const queryCache = useQueryCache()

const props = defineProps<{
  category: Category | null
}>()

const open = defineModel<boolean>('open', { default: false })

const { data: allCategories } = useCategoriesIncludingArchived()
const { mutateAsync: updateCategory, asyncStatus } = useUpdateCategory()

const name = ref('')
const icon = ref('')

// Reseed the draft each time the dialog opens for a category (the shared
// dialog instance lives outside the row loop; `immediate` covers mounting
// with the dialog already open).
watch(
  () => [open.value, props.category] as const,
  ([isOpen, category]) => {
    if (isOpen && category) {
      name.value = category.name
      icon.value = category.icon
    }
  },
  { immediate: true },
)

const typeLabel = computed(() =>
  props.category?.type === 'income'
    ? t('transactions.types.income')
    : t('transactions.types.expense'),
)

const trimmed = computed(() => name.value.trim())
const canSubmit = computed(() => trimmed.value.length > 0 && asyncStatus.value !== 'loading')

async function submit(): Promise<void> {
  const category = props.category
  if (!category || !trimmed.value) return

  // The color stays paired to the picked icon; colors taken by OTHER
  // categories (archived included - they still render in charts) displace
  // to the nearest free palette color, same walk as creation.
  const takenColors = (allCategories.value ?? [])
    .filter((candidate) => candidate.id !== category.id)
    .map((candidate) => candidate.color)
  const color = pickCategoryColor(icon.value, takenColors)

  try {
    await updateCategory({
      id: category.id,
      payload: {
        name: trimmed.value,
        icon: icon.value,
        color,
        version: category.version,
      },
    })
    notification.success(t('editCategory.success'))
    open.value = false
  } catch (error) {
    if (error instanceof VersionConflictError) {
      // Refetch so the row picks up the concurrent version (the dialog closes
      // with the conflict message; the user can retry against fresh state).
      await queryCache.invalidateQueries({ key: ['categories'] })
    }
    notification.mutationError(error, {
      title: t('editCategory.title'),
      feature: 'category',
      action: 'update',
    })
  }
}
</script>

<template>
  <ResponsiveDialog
    v-model:open="open"
    class="sm:max-w-sm"
    data-testid="edit-category-dialog"
    close-button-in-header
    header-variant="bordered-row"
    bordered-footer
  >
    <template #title>{{ t('editCategory.title') }}</template>

    <form id="edit-category-form" class="flex flex-col gap-3" @submit.prevent="submit">
      <div class="flex items-center gap-3">
        <CategoryAvatar
          :icon="icon || '❔'"
          :color="CATEGORY_ICONS.find((option) => option.icon === icon)?.color"
          class="size-9 text-lg"
        />
        <div class="flex flex-col gap-0.5">
          <span class="text-[11px] font-medium text-muted-foreground">
            {{ t('editCategory.typeLabel') }}
          </span>
          <Badge
            variant="outline"
            class="w-fit rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
            data-testid="edit-category-type"
          >
            {{ typeLabel }}
          </Badge>
        </div>
      </div>

      <Field>
        <FieldLabel for="edit-category-name">{{ t('editCategory.nameLabel') }}</FieldLabel>
        <Input
          id="edit-category-name"
          v-model="name"
          data-testid="edit-category-name"
          :placeholder="t('editCategory.nameLabel')"
        />
      </Field>

      <Field>
        <FieldLabel>{{ t('editCategory.iconLabel') }}</FieldLabel>
        <!-- Live preview tiles: each emoji on the pastel tint of its own
             paired color (design-system identity rule, same as creation). -->
        <div
          class="flex flex-wrap gap-2"
          role="radiogroup"
          :aria-label="t('editCategory.iconLabel')"
        >
          <button
            v-for="(option, index) in CATEGORY_ICONS"
            :key="option.icon"
            type="button"
            role="radio"
            :aria-checked="icon === option.icon"
            :data-testid="`edit-category-icon-${index}`"
            class="flex size-10 items-center justify-center rounded-full text-lg transition-shadow"
            :class="
              icon === option.icon ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
            "
            :style="{ backgroundColor: `color-mix(in srgb, ${option.color} 15%, transparent)` }"
            @click="icon = option.icon"
          >
            {{ option.icon }}
          </button>
        </div>
      </Field>

      <p class="text-xs text-muted-foreground">{{ t('editCategory.typeImmutableHint') }}</p>
    </form>

    <template #footer>
      <Button type="button" variant="ghost" data-testid="edit-category-cancel" @click="open = false">
        {{ t('categoryManagement.cancel') }}
      </Button>
      <Button
        type="submit"
        form="edit-category-form"
        :loading="asyncStatus === 'loading'"
        :disabled="!canSubmit"
        data-testid="edit-category-submit"
      >
        {{ t('editCategory.submit') }}
      </Button>
    </template>
  </ResponsiveDialog>
</template>
