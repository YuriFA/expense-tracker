<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Debtor } from '@/entities/debtor'
import {
  balanceInDirection,
  type DebtDirection,
  type DebtOperation,
} from '@/entities/debt-operation'
import { debtorHistoryGroups } from '../model/selectors'
import { useAuthorLabel } from '@/features/household-author'
import OperationFormDialog from './OperationFormDialog.vue'
import DebtorFormDialog from './DebtorFormDialog.vue'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { Pencil } from '@lucide/vue'
import { DEFAULT_CURRENCY, formatMoney } from '@/shared/lib/money'

// Debtor history (debts capability): the debtor's operation history for one
// direction with the derived balance header, day-grouped newest first, and
// actions to add/edit operations and edit the contact - a web dialog instead
// of the mobile bottom sheet (web-screens-parity design D1).

const props = defineProps<{
  debtor: Debtor
  direction: DebtDirection
  operations: readonly DebtOperation[]
}>()

const open = defineModel<boolean>('open', { default: false })

const { t, locale } = useI18n()
const authorLabel = useAuthorLabel()
// Debts carry no currency of their own; the app display currency is fixed
// (currency-rub-only).
const displayCurrency = computed(() => DEFAULT_CURRENCY)

const directionLabel = computed(() =>
  props.direction === 'receivable' ? t('debts.receivable') : t('debts.payable'),
)
const balance = computed(() =>
  balanceInDirection(props.operations, props.debtor.id, props.direction),
)
const balanceText = computed(() =>
  formatMoney(balance.value, displayCurrency.value, locale.value),
)
const groups = computed(() =>
  debtorHistoryGroups(props.operations, props.debtor.id, props.direction, locale.value),
)

const operationText = (operation: DebtOperation) =>
  `${operation.kind === 'debt' ? '+' : '−'}\u00A0${formatMoney(operation.amount, displayCurrency.value, locale.value)}`

// One dialog instance + active item refs (convention 4).
const operationOpen = ref(false)
const activeOperation = ref<DebtOperation | null>(null)
const createKind = ref<'debt' | 'repayment'>('debt')

const openCreate = (kind: 'debt' | 'repayment') => {
  createKind.value = kind
  activeOperation.value = null
  operationOpen.value = true
}

const openEdit = (operation: DebtOperation) => {
  activeOperation.value = operation
  operationOpen.value = true
}

const editDebtorOpen = ref(false)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md" data-testid="debts-history-dialog">
      <DialogHeader class="flex-row items-center justify-between space-y-0">
        <DialogTitle>{{ debtor.name }}</DialogTitle>
        <Button
          variant="ghost"
          size="icon"
          :aria-label="t('debts.editContact')"
          data-testid="debts-history-edit-debtor"
          @click="editDebtorOpen = true"
        >
          <Pencil class="size-4" />
        </Button>
      </DialogHeader>

      <div class="text-center">
        <p class="text-xs font-medium uppercase text-muted-foreground">{{ directionLabel }}</p>
        <p class="text-2xl font-bold" :class="{ 'text-destructive': balance < 0 }" data-testid="debts-history-balance">
          {{ balanceText }}
        </p>
      </div>

      <div class="max-h-72 space-y-4 overflow-y-auto">
        <EmptyState v-if="groups.length === 0" :title="t('debts.historyEmpty')" />
        <div v-for="group in groups" :key="group.key" :data-testid="`debts-history-day-${group.key}`">
          <p class="text-xs font-medium uppercase text-muted-foreground">{{ group.title }}</p>
          <div class="mt-1 space-y-1">
            <button
              v-for="operation in group.operations"
              :key="operation.id"
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent/50"
              :data-testid="`debts-history-op-${operation.id}`"
              @click="openEdit(operation)"
            >
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm">
                  {{ operation.note || (operation.kind === 'debt' ? t('debts.debt') : t('debts.repayment')) }}
                </span>
                <span
                  v-if="authorLabel(operation.authorId)"
                  class="block text-xs text-muted-foreground"
                  :data-testid="`debts-history-op-${operation.id}-author`"
                >
                  {{ authorLabel(operation.authorId) }}
                </span>
              </span>
              <span
                class="text-sm font-medium"
                :class="operation.kind === 'debt' ? 'text-[var(--success)]' : 'text-destructive'"
              >
                {{ operationText(operation) }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <DialogFooter class="flex-row gap-2">
        <Button
          variant="outline"
          class="flex-1"
          data-testid="debts-new-repayment"
          @click="openCreate('repayment')"
        >
          {{ t('debts.repaymentAction') }}
        </Button>
        <Button class="flex-1" data-testid="debts-new-operation" @click="openCreate('debt')">
          {{ t('debts.debtAction') }}
        </Button>
      </DialogFooter>

      <OperationFormDialog
        v-if="operationOpen"
        :key="`${activeOperation?.id ?? 'create'}-${createKind}`"
        v-model:open="operationOpen"
        :debtor="debtor"
        :direction="direction"
        :operation="activeOperation"
        :operations="operations"
        :initial-kind="createKind"
      />

      <DebtorFormDialog
        v-if="editDebtorOpen"
        :key="debtor.id"
        v-model:open="editDebtorOpen"
        :debtor="debtor"
        @deleted="open = false"
      />
    </DialogContent>
  </Dialog>
</template>
