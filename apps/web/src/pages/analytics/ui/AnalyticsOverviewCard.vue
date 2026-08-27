<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { ChevronRight } from '@lucide/vue'
import { currentPeriod, monthLabel } from '@expense-tracker/dates'
import type { Category, Transaction } from '@expense-tracker/api'
import {
  categoryTotals,
  periodTotal,
  toChartEntries,
  type AnalyticsDirection,
} from '@/entities/analytics'
import { DonutChart, type DonutChartEntry } from '@/shared/ui/donut-chart'
import { ChartLegend } from '@/shared/ui/donut-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { formatMoney, type CurrencyCode } from '@/shared/lib/money'
import { useSettingsStore } from '@/shared/store/use-settings-store'

const props = defineProps<{
  direction: AnalyticsDirection
  transactions: readonly Transaction[]
  categories: readonly Category[]
}>()

const { t, locale } = useI18n()
// Analytics totals are plain minor-unit sums with no conversion (analytics
// capability); the mixed-currency display currency is the user's preference
// (the settings UI only offers AVAILABLE_CURRENCIES values).
const settings = useSettingsStore()
const displayCurrency = computed(() => settings.currency as CurrencyCode)

// The overview always shows the current device-local month; week/month/year
// selection lives on the detail screen (analytics capability).
const cursor = currentPeriod('month')

const title = computed(() =>
  props.direction === 'expense' ? t('analytics.expenses') : t('analytics.income'),
)
const total = computed(() => periodTotal(props.transactions, cursor, props.direction))
const entries = computed(() =>
  toChartEntries(categoryTotals(props.transactions, props.categories, cursor, props.direction), {
    top: 5,
    otherLabel: t('analytics.other'),
  }),
)
const totalText = computed(() => formatMoney(total.value, displayCurrency.value, locale.value))
const donutEntries = computed<DonutChartEntry[]>(() =>
  entries.value.map((entry) => ({
    id: entry.id,
    label: entry.label,
    color: entry.color,
    value: entry.totalMinor,
  })),
)
const testId = computed(() =>
  props.direction === 'expense' ? 'analytics-card-expenses' : 'analytics-card-income',
)
const a11yLabel = computed(
  () =>
    `${title.value}, ${monthLabel(cursor.start.getFullYear(), cursor.start.getMonth(), locale.value)} ${cursor.start.getFullYear()}, ${totalText.value}`,
)
</script>

<template>
  <Card as-child>
    <RouterLink
      :to="`/analytics/${direction}`"
      :data-testid="testId"
      :aria-label="a11yLabel"
      class="block transition hover:bg-accent/50"
    >
      <CardHeader class="flex-row items-center justify-between">
        <CardTitle>{{ title }}</CardTitle>
        <ChevronRight class="size-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div v-if="total > 0" class="flex items-center gap-6">
          <DonutChart :entries="donutEntries" :size="120" :stroke-width="14" :aria-label="a11yLabel">
            <span class="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
              {{ t('analytics.amountCaption') }}
            </span>
            <span class="text-sm font-semibold">{{ totalText }}</span>
          </DonutChart>
          <ChartLegend :entries="entries" />
        </div>
        <p v-else class="py-6 text-sm text-muted-foreground">
          {{ direction === 'expense' ? t('analytics.emptyExpense') : t('analytics.emptyIncome') }}
        </p>
      </CardContent>
    </RouterLink>
  </Card>
</template>
