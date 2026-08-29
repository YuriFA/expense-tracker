<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { HandCoins, TrendingDown, TrendingUp, Wallet } from '@lucide/vue'
import { currentPeriod, monthLabel, periodToUtcDayRange } from '@expense-tracker/dates'
import { periodTotal, type AnalyticsDirection } from '@/entities/analytics'
import { useAccounts } from '@/entities/account'
import { useTransactions } from '@/entities/transaction'
import { useDebtOperations, totalsByDirection } from '@/entities/debt-operation'
import { formatMoney, DEFAULT_CURRENCY } from '@/shared/lib/money'
import { Skeleton } from '@/shared/ui/skeleton'
import { ErrorState } from '@/shared/ui/error-state'
import QuickActionsCard from './QuickActionsCard.vue'
import StatCard from './StatCard.vue'
import CategoryBreakdownCard from './CategoryBreakdownCard.vue'
import RecentTransactionsCard from './RecentTransactionsCard.vue'
import AccountsCard from './AccountsCard.vue'
import DebtsCard from './DebtsCard.vue'

// The overview shows the current device-local month, same as the analytics
// page (analytics capability); figures derive in memory from the selectors.
const { t, locale } = useI18n()
const cursor = currentPeriod('month')
const range = periodToUtcDayRange(cursor)
const monthCaption = computed(
  () =>
    `${monthLabel(cursor.start.getFullYear(), cursor.start.getMonth(), locale.value)} ${cursor.start.getFullYear()}`,
)

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
} = useTransactions({ type: 'expense', ...range })
const {
  data: incomes,
  isLoading: isLoadingIncomes,
  error: incomesError,
  refetch: refetchIncomes,
} = useTransactions({ type: 'income', ...range })
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
  periodTotal(direction === 'expense' ? (expenses.value ?? []) : (incomes.value ?? []), cursor, direction)
const debtTotals = computed(() => totalsByDirection(debtOperations.value ?? []))

const stats = computed(() => [
  { label: t('pages.accounts'), amount: format(balanceMinor.value), icon: Wallet, tone: 'primary' as const },
  { label: t('analytics.income'), amount: format(periodTotalFor('income')), icon: TrendingUp, tone: 'success' as const },
  { label: t('analytics.expenses'), amount: format(periodTotalFor('expense')), icon: TrendingDown, tone: 'warning' as const },
  {
    label: t('pages.debts'),
    amount: format(debtTotals.value.receivable - debtTotals.value.payable),
    icon: HandCoins,
    tone: 'neutral' as const,
  },
])
</script>

<template>
  <section class="space-y-6">
    <header>
      <h1 class="text-[32px] font-bold tracking-tight">{{ t('dashboard.overview') }}</h1>
      <p class="text-base font-medium text-muted-foreground">{{ monthCaption }}</p>
    </header>

    <ErrorState v-if="error" @retry="refetch" />
    <div v-else-if="isLoading" class="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <Skeleton v-for="n in 4" :key="n" class="h-[124px] rounded-lg" />
    </div>
    <div
      v-else
      class="grid grid-cols-2 gap-4 xl:grid-cols-4"
      data-testid="dashboard-stats"
    >
      <StatCard
        v-for="stat in stats"
        :key="stat.label"
        :label="stat.label"
        :amount="stat.amount"
        :icon="stat.icon"
        :tone="stat.tone"
      />
    </div>

    <QuickActionsCard />

    <div class="grid gap-6 xl:grid-cols-3">
      <div class="space-y-6 xl:col-span-2">
        <CategoryBreakdownCard />
        <RecentTransactionsCard />
      </div>
      <div class="space-y-6">
        <AccountsCard />
        <DebtsCard />
      </div>
    </div>
  </section>
</template>
