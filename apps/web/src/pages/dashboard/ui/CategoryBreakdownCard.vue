<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { currentPeriod, periodToUtcDayRange } from '@expense-tracker/dates'
import { categoryTotals, periodTotal, percentLabel } from '@/entities/analytics'
import { useTransactions } from '@/entities/transaction'
import { CategoryAvatar, useCategories } from '@/entities/category'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { ErrorState } from '@/shared/ui/error-state'
import { DEFAULT_CURRENCY, formatMoney } from '@/shared/lib/money'

// Current-month expense breakdown, derived in memory with the same selectors
// as the analytics page (analytics capability) - no extra backend aggregate.
const { t, locale } = useI18n()
const cursor = currentPeriod('month')
const range = periodToUtcDayRange(cursor)

const {
  data: transactions,
  isLoading: isLoadingTx,
  error: txError,
  refetch: refetchTx,
} = useTransactions({ type: 'expense', ...range })
const {
  data: categories,
  isLoading: isLoadingCategories,
  error: categoriesError,
  refetch: refetchCategories,
} = useCategories()

const isLoading = computed(() => isLoadingTx.value || isLoadingCategories.value)
const error = computed(() => txError.value || categoriesError.value)
const refetch = () => Promise.all([refetchTx(), refetchCategories()])

const totalMinor = computed(() =>
  periodTotal(transactions.value ?? [], cursor, 'expense'),
)
const rows = computed(() =>
  categoryTotals(transactions.value ?? [], categories.value ?? [], cursor, 'expense'),
)

const format = (value: number) => formatMoney(value, DEFAULT_CURRENCY, locale.value)
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t('dashboard.categoriesTitle') }}</CardTitle>
    </CardHeader>
    <CardContent>
      <ErrorState v-if="error" @retry="refetch" />
      <template v-else-if="isLoading">
        <div v-for="n in 3" :key="n" class="flex items-center gap-3 py-2.5">
          <Skeleton class="size-9 rounded-full" />
          <Skeleton class="h-4 flex-1" />
          <Skeleton class="h-4 w-20" />
        </div>
      </template>
      <p v-else-if="totalMinor <= 0" class="py-6 text-sm text-muted-foreground">
        {{ t('analytics.emptyMonthExpense') }}
      </p>
      <div v-else>
        <div
          v-for="row in rows"
          :key="row.category.id"
          class="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-0"
        >
          <CategoryAvatar
            :icon="row.category.icon"
            :color="row.category.color"
            class="size-9"
          />
          <p class="min-w-0 flex-1 truncate text-sm font-medium">{{ row.category.name }}</p>
          <p class="text-sm font-semibold tabular-nums">{{ format(row.totalMinor) }}</p>
          <p class="w-14 text-right text-xs text-muted-foreground tabular-nums">
            {{ percentLabel(row.totalMinor, totalMinor, locale) }}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
