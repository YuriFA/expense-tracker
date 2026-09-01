<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  calendarDayKey,
  fullDayLabel,
  periodRangeLabel,
  periodToUtcDayRange,
  shiftPeriod,
  transactionsInPeriod,
  type PeriodCursor,
} from '@expense-tracker/dates'
import type { Category, Transaction } from '@expense-tracker/api'
import type { AnalyticsDirection } from '@/entities/analytics'
import { useTransactions } from '@/entities/transaction'
import { EditTransactionDialog } from '@/features/transaction/edit'
import { DeleteTransactionDialog } from '@/features/transaction/delete'
import { ResponsiveDialog } from '@/shared/ui/responsive-dialog'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { ChevronLeft, ChevronRight, Trash2 } from '@lucide/vue'
import { DEFAULT_CURRENCY, formatMoney } from '@/shared/lib/money'

// Category drill-down (analytics capability): the selected category's
// transactions for the detail screen's period, with the period navigable
// inside the overlay. The shared responsive-dialog keeps the centered desktop
// dialog and switches to the mobile drawer presentation below 768px.

const props = defineProps<{
  category: Category
  direction: AnalyticsDirection
  /** Initial period; navigation afterwards is dialog-local. */
  cursor: PeriodCursor
}>()

const open = defineModel<boolean>('open', { default: false })
const { t, locale } = useI18n()
// Analytics totals carry no currency of their own; the app display currency
// is fixed (currency-rub-only).
const displayCurrency = computed(() => DEFAULT_CURRENCY)

const localCursor = ref<PeriodCursor>(props.cursor)
const newestFirst = ref(true)

const queryOptions = computed(() => ({
  type: props.direction,
  categoryId: props.category.id,
  ...periodToUtcDayRange(localCursor.value),
}))
const { data } = useTransactions(queryOptions, { enabled: computed(() => open.value) })

// Repository day filters are a UTC superset; exact membership stays local.
const transactions = computed(() =>
  transactionsInPeriod(data.value ?? [], localCursor.value),
)
const total = computed(() =>
  transactions.value.reduce((sum, tx) => sum + tx.amount, 0),
)
const totalText = computed(() => formatMoney(total.value, displayCurrency.value, locale.value))
const rangeLabel = computed(() => periodRangeLabel(localCursor.value, locale.value))

interface DayGroup {
  key: string
  title: string
  transactions: Transaction[]
}

const groups = computed<DayGroup[]>(() => {
  const sorted = [...transactions.value].sort((a, b) =>
    newestFirst.value
      ? b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id)
      : a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id),
  )
  const byDay = new Map<string, Transaction[]>()
  for (const tx of sorted) {
    const key = calendarDayKey(new Date(tx.occurredAt))
    byDay.set(key, [...(byDay.get(key) ?? []), tx])
  }
  return [...byDay.entries()].map(([key, dayTransactions]) => ({
    key,
    title: fullDayLabel(new Date(dayTransactions[0]!.occurredAt), locale.value),
    transactions: dayTransactions,
  }))
})

const emptyText = computed(() => {
  if (props.direction === 'expense') {
    return localCursor.value.kind === 'month'
      ? t('analytics.emptyMonthExpense')
      : t('analytics.emptyPeriodExpense')
  }
  return localCursor.value.kind === 'month'
    ? t('analytics.emptyMonthIncome')
    : t('analytics.emptyPeriodIncome')
})

const totalWord = computed(() =>
  props.direction === 'expense'
    ? t('analytics.spentWord')
    : t('analytics.receivedWord'),
)

function stepPeriod(steps: number) {
  localCursor.value = shiftPeriod(localCursor.value, steps)
}

// One dialog instance outside the list + an "active item" ref (convention 4).
const editOpen = ref(false)
const deleteOpen = ref(false)
const activeTransaction = ref<Transaction | null>(null)
const pendingDeleteId = ref<string | null>(null)

const openEdit = (transaction: Transaction) => {
  activeTransaction.value = transaction
  editOpen.value = true
}

const openDelete = (transaction: Transaction) => {
  activeTransaction.value = null
  pendingDeleteId.value = transaction.id
  deleteOpen.value = true
}
</script>

<template>
  <ResponsiveDialog v-model:open="open" class="sm:max-w-md" data-testid="category-cashflow-dialog">
    <template #title>{{ category.name || t('analytics.category') }}</template>

    <div class="flex items-center justify-between gap-2">
      <Button
        variant="outline"
        size="icon"
        :aria-label="t('analytics.prevPeriod')"
        data-testid="category-cashflow-prev"
        @click="stepPeriod(-1)"
      >
        <ChevronLeft class="size-4" />
      </Button>
      <div class="text-center">
        <p class="text-sm font-medium" data-testid="category-cashflow-range">
          {{ rangeLabel }}
        </p>
        <p class="text-xs text-muted-foreground">
          {{ totalText }} {{ totalWord }}
        </p>
      </div>
      <Button
        variant="outline"
        size="icon"
        :aria-label="t('analytics.nextPeriod')"
        data-testid="category-cashflow-next"
        @click="stepPeriod(1)"
      >
        <ChevronRight class="size-4" />
      </Button>
    </div>

    <Button
      variant="ghost"
      size="sm"
      class="self-start text-muted-foreground"
      data-testid="category-cashflow-sort"
      @click="newestFirst = !newestFirst"
    >
      {{ newestFirst ? t('analytics.sortNewestFirst') : t('analytics.sortOldestFirst') }}
    </Button>

    <div class="max-h-80 space-y-4 overflow-y-auto">
      <EmptyState v-if="groups.length === 0" :title="emptyText" />
      <div v-for="group in groups" :key="group.key" :data-testid="`category-cashflow-day-${group.key}`">
        <p class="text-xs font-medium uppercase text-muted-foreground">{{ group.title }}</p>
        <div class="mt-1 space-y-1">
          <div
            v-for="transaction in group.transactions"
            :key="transaction.id"
            class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/70"
            :data-testid="`category-cashflow-tx-${transaction.id}`"
          >
            <button
              type="button"
              class="min-w-0 flex-1 truncate text-left text-sm"
              :aria-label="`${t('editTransaction.trigger')}: ${transaction.description || category.name}`"
              @click="openEdit(transaction)"
            >
              {{ transaction.description || category.name }}
            </button>
            <span class="text-sm font-medium">{{ formatMoney(transaction.amount, displayCurrency, locale) }}</span>
            <Button
              variant="ghost"
              size="icon"
              class="size-7"
              :aria-label="t('deleteTransaction.trigger')"
              @click="openDelete(transaction)"
            >
              <Trash2 class="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <EditTransactionDialog
      v-if="activeTransaction"
      v-model:open="editOpen"
      :transaction="activeTransaction"
    />
    <DeleteTransactionDialog
      v-if="pendingDeleteId"
      v-model:open="deleteOpen"
      :transaction-id="pendingDeleteId"
    />
  </ResponsiveDialog>
</template>
