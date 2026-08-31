<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { HandCoins, TrendingDown, TrendingUp, Wallet } from '@lucide/vue'
import {
  calendarDayKey,
  currentPeriod,
  isSamePeriod,
  monthLabel,
  periodToUtcDayRange,
  shiftPeriod,
  type PeriodCursor,
} from '@expense-tracker/dates'
import { periodTotal, type AnalyticsDirection } from '@/entities/analytics'
import { useAccounts } from '@/entities/account'
import { useTransactions } from '@/entities/transaction'
import { useDebtOperations, totalsByDirection } from '@/entities/debt-operation'
import { formatMoney, DEFAULT_CURRENCY } from '@/shared/lib/money'
import { Skeleton } from '@/shared/ui/skeleton'
import { ErrorState } from '@/shared/ui/error-state'
import StatCard from './StatCard.vue'
import CategoryBreakdownCard from './CategoryBreakdownCard.vue'
import RecentTransactionsCard from './RecentTransactionsCard.vue'
import AccountsCard from './AccountsCard.vue'
import DebtsCard from './DebtsCard.vue'
import PeriodNav from './PeriodNav.vue'

// The overview starts on the current device-local month; the header
// navigator steps the cursor and the month-scoped queries rekey on the
// UTC-day superset range (figures derive in memory from the selectors).
// Snapshot cards (accounts, debts) are period-independent by nature.
const { t, locale } = useI18n()
const cursor = ref<PeriodCursor>(currentPeriod('month'))
const range = computed(() => periodToUtcDayRange(cursor.value))
const isCurrentPeriod = computed(() => isSamePeriod(cursor.value, currentPeriod('month')))
const monthCaption = computed(
  () =>
    `${monthLabel(cursor.value.start.getFullYear(), cursor.value.start.getMonth(), locale.value)} ${cursor.value.start.getFullYear()}`,
)
const goPrevPeriod = () => {
  cursor.value = shiftPeriod(cursor.value, -1)
}
const goNextPeriod = () => {
  cursor.value = shiftPeriod(cursor.value, 1)
}

const {
  data: accounts,
  isLoading: isLoadingAccounts,
  error: accountsError,
  refetch: refetchAccounts,
} = useAccounts()
const {
  data: expenses,
  isLoading: isLoadingExpenses,
  error: expensesError,
  refetch: refetchExpenses,
} = useTransactions(() => ({ type: 'expense', ...range.value }))
const {
  data: incomes,
  isLoading: isLoadingIncomes,
  error: incomesError,
  refetch: refetchIncomes,
} = useTransactions(() => ({ type: 'income', ...range.value }))
const {
  data: debtOperations,
  isLoading: isLoadingDebts,
  error: debtsError,
  refetch: refetchDebts,
} = useDebtOperations()

const isLoading = computed(
  () =>
    isLoadingAccounts.value ||
    isLoadingExpenses.value ||
    isLoadingIncomes.value ||
    isLoadingDebts.value,
)
const error = computed(
  () => accountsError.value || expensesError.value || incomesError.value || debtsError.value,
)
const refetch = () =>
  Promise.all([
    refetchAccounts(),
    refetchExpenses(),
    refetchIncomes(),
    refetchDebts(),
  ])

// Plain minor-unit sums in the fixed app display currency (currency-rub-only).
const format = (value: number) => formatMoney(value, DEFAULT_CURRENCY, locale.value)

const balanceMinor = computed(() =>
  (accounts.value ?? []).reduce((sum, account) => sum + (account.balance ?? 0), 0),
)
const periodTotalFor = (direction: AnalyticsDirection) =>
  periodTotal(
    direction === 'expense' ? (expenses.value ?? []) : (incomes.value ?? []),
    cursor.value,
    direction,
  )
const debtTotals = computed(() => totalsByDirection(debtOperations.value ?? []))

// The income/expense stat cards deep-link the transactions screen's URL
// filter: local calendar-day bounds of the selected month (the format
// transactions-query.ts parses), not the dashboard's UTC query superset.
const monthRange = computed(() => {
  const start = cursor.value.start
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
  return { from: calendarDayKey(start), to: calendarDayKey(end) }
})

const stats = computed(() => [
  {
    label: t('pages.accounts'),
    amount: format(balanceMinor.value),
    icon: Wallet,
    tone: 'primary' as const,
    to: { path: '/accounts' },
  },
  {
    label: t('analytics.income'),
    amount: format(periodTotalFor('income')),
    icon: TrendingUp,
    tone: 'success' as const,
    to: {
      path: '/transactions',
      query: { type: 'income', from: monthRange.value.from, to: monthRange.value.to },
    },
  },
  {
    label: t('analytics.expenses'),
    amount: format(periodTotalFor('expense')),
    icon: TrendingDown,
    tone: 'warning' as const,
    to: {
      path: '/transactions',
      query: { type: 'expense', from: monthRange.value.from, to: monthRange.value.to },
    },
  },
  {
    label: t('pages.debts'),
    amount: format(debtTotals.value.receivable - debtTotals.value.payable),
    icon: HandCoins,
    tone: 'neutral' as const,
    to: { path: '/debts' },
  },
])
</script>

<template>
  <section class="space-y-6">
    <header>
      <h1 class="text-[32px] font-bold tracking-tight">{{ t('dashboard.overview') }}</h1>
      <PeriodNav
        :label="monthCaption"
        :prev-label="t('dashboard.prevMonth')"
        :next-label="t('dashboard.nextMonth')"
        :can-next="!isCurrentPeriod"
        @prev="goPrevPeriod"
        @next="goNextPeriod"
      />
    </header>

    <ErrorState v-if="error" @retry="refetch" />
    <div v-else-if="isLoading" class="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <Skeleton v-for="n in 4" :key="n" class="h-31 rounded-lg" />
    </div>
    <div
      v-else
      class="grid grid-cols-2 gap-4 xl:grid-cols-4"
      data-testid="dashboard-stats"
    >
      <!-- The link wraps the card surface: hover ring + focus ring give the
           clickability affordance; StatCard stays presentational. -->
      <RouterLink
        v-for="stat in stats"
        :key="stat.label"
        :to="stat.to"
        class="block rounded-lg cursor-pointer transition-shadow duration-200 hover:ring-1 hover:ring-muted-foreground/30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <StatCard
          :label="stat.label"
          :amount="stat.amount"
          :icon="stat.icon"
          :tone="stat.tone"
        />
      </RouterLink>
    </div>

    <!-- No inline creation entry points (web-unified-transaction-entry):
         adding happens through the shell triggers (sidebar CTA / «N» /
         command palette) and the FAB speed-dial below 768px. -->

    <div class="grid gap-6 xl:grid-cols-3">
      <div class="space-y-6 xl:col-span-2">
        <CategoryBreakdownCard :cursor="cursor" />
        <RecentTransactionsCard :range="range" />
      </div>
      <div class="space-y-6">
        <AccountsCard />
        <DebtsCard />
      </div>
    </div>
  </section>
</template>
