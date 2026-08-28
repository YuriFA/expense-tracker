<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { currentPeriod, monthLabel, periodToUtcDayRange } from '@expense-tracker/dates'
import { useTransactions } from '@/entities/transaction'
import { useCategories } from '@/entities/category'
import { ErrorState } from '@/shared/ui/error-state'
import { Skeleton } from '@/shared/ui/skeleton'
import AnalyticsOverviewCard from './AnalyticsOverviewCard.vue'

const { t, locale } = useI18n()

// Both cards share one month-scoped read per direction; figures derive in
// memory from the selectors (no network dependency - analytics capability).
const cursor = currentPeriod('month')
const range = periodToUtcDayRange(cursor)

const monthCaption = computed(
  () =>
    `${monthLabel(cursor.start.getFullYear(), cursor.start.getMonth(), locale.value)} ${cursor.start.getFullYear()}`,
)

const {
  data: expenses,
  isLoading: loadingExpenses,
  error: expensesError,
  refetch: refetchExpenses,
} = useTransactions({ type: 'expense', ...range })
const {
  data: incomes,
  isLoading: loadingIncomes,
  error: incomesError,
  refetch: refetchIncomes,
} = useTransactions({ type: 'income', ...range })
const {
  data: categories,
  isLoading: loadingCategories,
  error: categoriesError,
  refetch: refetchCategories,
} = useCategories()

const isLoading = computed(
  () => loadingExpenses.value || loadingIncomes.value || loadingCategories.value,
)
const error = computed(
  () => expensesError.value || incomesError.value || categoriesError.value,
)
const refetch = () =>
  Promise.all([refetchExpenses(), refetchIncomes(), refetchCategories()])
</script>

<template>
  <section>
    <h1 class="text-3xl font-bold">{{ t('pages.analytics') }}</h1>
    <p class="text-sm text-muted-foreground">{{ monthCaption }}</p>

    <div v-if="isLoading" class="mt-6 grid gap-4 md:grid-cols-2">
      <Skeleton class="h-48 rounded-xl" data-testid="analytics-skeleton" />
      <Skeleton class="h-48 rounded-xl" />
    </div>
    <div v-else-if="error" class="mt-6">
      <ErrorState @retry="refetch" />
    </div>
    <div v-else class="mt-6 grid gap-4 md:grid-cols-2">
      <AnalyticsOverviewCard direction="expense" :transactions="expenses ?? []" :categories="categories ?? []" />
      <AnalyticsOverviewCard direction="income" :transactions="incomes ?? []" :categories="categories ?? []" />
    </div>
  </section>
</template>
