<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  currentPeriod,
  periodRangeLabel,
  periodToUtcDayRange,
  shiftPeriod,
  type AnalyticsPeriodKind,
  type PeriodCursor,
} from '@expense-tracker/dates'
import type { Category, TransactionQuery } from '@expense-tracker/api'
import {
  categoryTotals,
  percentLabel,
  periodTotal,
  toChartEntries,
  type AnalyticsDirection,
} from '@/entities/analytics'
import { useTransactions } from '@/entities/transaction'
import { useCategories } from '@/entities/category'
import { DonutChart, type DonutChartEntry } from '@/shared/ui/donut-chart'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { ErrorState } from '@/shared/ui/error-state'
import { Skeleton } from '@/shared/ui/skeleton'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { DEFAULT_CURRENCY, formatMoney } from '@/shared/lib/money'
import CategoryCashflowDialog from './CategoryCashflowDialog.vue'

// Per-direction detail (analytics capability): period selector, prev/next
// navigation over periods, interactive donut + breakdown with include
// checkboxes. A keyed child of the route page so switching direction
// remounts with fresh state, like the mobile screen push.

const props = defineProps<{
  direction: AnalyticsDirection
}>()

const { t, locale } = useI18n()
// Minor-unit sums with no conversion (analytics capability); the currency-
// less total is formatted in the fixed app display currency
// (currency-rub-only).
const displayCurrency = computed(() => DEFAULT_CURRENCY)

const PERIOD_KINDS: readonly AnalyticsPeriodKind[] = ['week', 'month', 'year']

// Literal keys per branch (the i18n lint bans dynamic keys).
const periodLabels = computed<Record<AnalyticsPeriodKind, string>>(() => ({
  week: t('analytics.week'),
  month: t('analytics.month'),
  year: t('analytics.year'),
}))

const kind = ref<AnalyticsPeriodKind>('month')
const cursor = ref<PeriodCursor>(currentPeriod('month'))
const selectedCategoryId = ref<string | null>(null)
const excludedIds = ref<Set<string>>(new Set())

const queryOptions = computed<TransactionQuery>(() => ({
  type: props.direction,
  ...periodToUtcDayRange(cursor.value),
}))
const {
  data: transactions,
  isLoading,
  error,
  refetch,
} = useTransactions(queryOptions)
const { data: categories, isLoading: categoriesLoading } = useCategories()

const directionCategories = computed(() =>
  (categories.value ?? []).filter((c) => c.type === props.direction),
)
const totals = computed(() =>
  categoryTotals(transactions.value ?? [], categories.value ?? [], cursor.value, props.direction),
)
const totalsById = computed(
  () => new Map(totals.value.map((total) => [total.category.id, total.totalMinor])),
)
const total = computed(() => periodTotal(transactions.value ?? [], cursor.value, props.direction))
const totalText = computed(() => formatMoney(total.value, displayCurrency.value, locale.value))

const title = computed(() =>
  props.direction === 'expense' ? t('analytics.expenses') : t('analytics.income'),
)
const allLabel = computed(() =>
  props.direction === 'expense' ? t('analytics.allExpenses') : t('analytics.allIncome'),
)

// Every direction category gets a row (0 kept in place), sorted total desc;
// the selected category floats to the top below the summary row.
const rows = computed(() => {
  const all = directionCategories.value.map((category) => ({
    category,
    totalMinor: totalsById.value.get(category.id) ?? 0,
  }))
  all.sort((a, b) => b.totalMinor - a.totalMinor)
  const selectedIndex = all.findIndex((row) => row.category.id === selectedCategoryId.value)
  if (selectedIndex > 0) {
    const [selected] = all.splice(selectedIndex, 1)
    all.unshift(selected!)
  }
  return all
})

// Only included categories with movement are charted; shares renormalize to
// the INCLUDED total (the ring stays full). No cap, no «other» aggregate.
const chartEntries = computed<DonutChartEntry[]>(() => {
  const included = totals.value.filter(
    (item) => item.totalMinor > 0 && !excludedIds.value.has(item.category.id),
  )
  return toChartEntries(included).map((entry) => ({
    id: entry.id,
    label: entry.label,
    color: entry.color,
    value: entry.totalMinor,
  }))
})
const chartedTotal = computed(() =>
  chartEntries.value.reduce((sum, entry) => sum + entry.value, 0),
)

const chartAriaLabel = computed(() => {
  if (chartedTotal.value <= 0) return t('analytics.noData')
  const summary = chartEntries.value
    .map((entry) => `${entry.label} ${percentLabel(entry.value, chartedTotal.value, locale.value)}`)
    .join(', ')
  return `${title.value} ${t('analytics.byCategory')}: ${summary}`
})

const rangeLabel = computed(() => periodRangeLabel(cursor.value, locale.value).toUpperCase())

const allIncluded = computed(() =>
  directionCategories.value.every((category) => !excludedIds.value.has(category.id)),
)

function resetSelection() {
  selectedCategoryId.value = null
  excludedIds.value = new Set()
}

function selectKind(next: AnalyticsPeriodKind) {
  kind.value = next
  cursor.value = currentPeriod(next)
  resetSelection()
}

function stepPeriod(steps: number) {
  cursor.value = shiftPeriod(cursor.value, steps)
  resetSelection()
}

function toggleSegment(id: string) {
  selectedCategoryId.value = selectedCategoryId.value === id ? null : id
}

function toggleCategory(categoryId: string) {
  const next = new Set(excludedIds.value)
  if (next.has(categoryId)) next.delete(categoryId)
  else next.add(categoryId)
  excludedIds.value = next
}

function toggleMaster() {
  excludedIds.value = allIncluded.value
    ? new Set(directionCategories.value.map((category) => category.id))
    : new Set()
}

// Drill-down: one dialog instance + the active category (convention 4).
const drilldownOpen = ref(false)
const drilldownCategory = ref<Category | null>(null)

const openDrilldown = (category: Category) => {
  drilldownCategory.value = category
  drilldownOpen.value = true
}
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold">{{ title }}</h1>

    <div class="mt-4 flex gap-2" role="group" :aria-label="title">
      <Button
        v-for="periodKind in PERIOD_KINDS"
        :key="periodKind"
        :variant="kind === periodKind ? 'default' : 'outline'"
        class="flex-1"
        :aria-pressed="kind === periodKind"
        :data-testid="`analytics-period-${periodKind}`"
        @click="selectKind(periodKind)"
      >
        {{ periodLabels[periodKind] }}
      </Button>
    </div>

    <div v-if="isLoading || categoriesLoading" class="mt-6">
      <Skeleton class="h-64 rounded-xl" />
    </div>
    <div v-else-if="error" class="mt-6">
      <ErrorState @retry="refetch" />
    </div>
    <template v-else>
      <div class="mt-6 flex flex-col items-center gap-2">
        <div class="flex items-center gap-4 self-stretch justify-between">
          <Button
            variant="outline"
            size="icon"
            :aria-label="t('analytics.prevPeriod')"
            data-testid="analytics-period-prev"
            @click="stepPeriod(-1)"
          >
            <ChevronLeft class="size-4" />
          </Button>
          <div class="text-center">
            <span class="text-2xl font-bold" data-testid="analytics-detail-total">
              {{ totalText }}
            </span>
            <span class="ml-1 text-sm text-muted-foreground">{{ t('analytics.totalCaption') }}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            :aria-label="t('analytics.nextPeriod')"
            data-testid="analytics-period-next"
            @click="stepPeriod(1)"
          >
            <ChevronRight class="size-4" />
          </Button>
        </div>

        <DonutChart
          :entries="chartEntries"
          :size="216"
          :stroke-width="24"
          :selected-id="selectedCategoryId"
          :aria-label="chartAriaLabel"
          class="mt-2"
          @select="toggleSegment"
        >
          <span
            class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            data-testid="analytics-period-label"
          >
            {{ rangeLabel }}
          </span>
        </DonutChart>
      </div>

      <Card class="mt-6" data-testid="analytics-category-list">
        <CardHeader>
          <CardTitle class="text-base">{{ allLabel }}</CardTitle>
        </CardHeader>
        <CardContent class="pb-4">
          <div
            class="flex items-center gap-3 border-b pb-3"
            data-testid="analytics-total-row"
          >
            <input
              type="checkbox"
              :checked="allIncluded"
              :aria-label="t('analytics.showAllCategories', { label: allLabel })"
              data-testid="analytics-total-check"
              @change="toggleMaster"
            />
            <span class="flex-1 text-sm font-semibold">{{ allLabel }}</span>
            <span class="text-sm font-semibold" data-testid="analytics-total-amount">
              {{ totalText }}
            </span>
            <span class="w-12 text-right text-xs text-muted-foreground">
              {{ percentLabel(total, total, locale) }}
            </span>
          </div>
          <ul>
            <li
              v-for="row in rows"
              :key="row.category.id"
              class="flex items-center gap-3 border-b py-2.5 last:border-b-0"
              :class="{ 'opacity-50': selectedCategoryId !== null && selectedCategoryId !== row.category.id }"
            >
              <input
                type="checkbox"
                :checked="!excludedIds.has(row.category.id)"
                :style="{ accentColor: row.category.color }"
                :aria-label="t('analytics.showOnChart', { name: row.category.name })"
                :data-testid="`analytics-category-check-${row.category.id}`"
                @change="toggleCategory(row.category.id)"
              />
              <button
                type="button"
                class="min-w-0 flex-1 truncate text-left text-sm hover:underline"
                :data-testid="`analytics-category-row-${row.category.id}`"
                @click="openDrilldown(row.category)"
              >
                {{ row.category.name }}
              </button>
              <span class="text-sm">{{ formatMoney(row.totalMinor, displayCurrency, locale) }}</span>
              <span class="w-12 text-right text-xs text-muted-foreground">
                {{ percentLabel(row.totalMinor, total, locale) }}
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </template>

    <CategoryCashflowDialog
      v-if="drilldownCategory"
      :key="drilldownCategory.id"
      v-model:open="drilldownOpen"
      :category="drilldownCategory"
      :direction="direction"
      :cursor="cursor"
    />
  </section>
</template>
