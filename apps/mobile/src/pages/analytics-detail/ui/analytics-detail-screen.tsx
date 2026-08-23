// Analytics detail: the period-scoped (week/month/year) expense or income
// breakdown by category for one direction (design D5-D7). One parametrized
// screen, not two: the direction changes only copy and the query's type
// filter. Period state is a single cursor (the kind is derived from it -
// conventions §2: derive instead of duplicating); switching the kind resets
// to the current period, and navigation is never blocked at "now" (future
// periods simply show their empty state).
// TODO(i18n): RU copy stays hardcoded until react-i18next is wired (see
// apps/mobile/AGENTS.md §i18n).

import { useState } from 'react'
import { View } from 'react-native'
import {
  currentPeriod,
  periodRangeLabel,
  periodToUtcDayRange,
  shiftPeriod,
  type AnalyticsPeriodKind,
  type PeriodCursor,
} from '@expense-tracker/dates'
import {
  DonutChart,
  categoryTotals,
  percentLabel,
  periodTotal,
  toChartEntries,
  type AnalyticsDirection,
} from '@/features/analytics'
import { useCategories } from '@/entities/category'
import { useTransactions } from '@/entities/transaction'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Icon } from '@/shared/ui/icon'
import { IconButton } from '@/shared/ui/icon-button'
import { Screen } from '@/shared/ui/screen'
import { ScreenHeader, ScreenScrollView } from '@/shared/ui/screen-header'
import { Text } from '@/shared/ui/text'
import { formatAmount } from '@/shared/lib/format/format'

const PERIOD_KINDS: Array<{ kind: AnalyticsPeriodKind; label: string; testId: string }> = [
  { kind: 'week', label: 'Неделя', testId: 'analytics-period-week' },
  { kind: 'month', label: 'Месяц', testId: 'analytics-period-month' },
  { kind: 'year', label: 'Год', testId: 'analytics-period-year' },
]

const DIRECTION_VIEWS: Record<
  AnalyticsDirection,
  { title: string; allLabel: string; emptyText: string }
> = {
  expense: {
    title: 'Расходы',
    allLabel: 'Все расходы',
    emptyText: 'Нет расходов за этот период',
  },
  income: {
    title: 'Доходы',
    allLabel: 'Все доходы',
    emptyText: 'Нет доходов за этот период',
  },
}

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 }

export interface AnalyticsDetailScreenProps {
  direction: AnalyticsDirection
}

export function AnalyticsDetailScreen({ direction }: AnalyticsDetailScreenProps) {
  const view = DIRECTION_VIEWS[direction]
  const [cursor, setCursor] = useState<PeriodCursor>(() => currentPeriod('month'))

  const transactionsQuery = useTransactions({ type: direction, ...periodToUtcDayRange(cursor) })
  const categoriesQuery = useCategories(direction)
  const transactions = transactionsQuery.data ?? []
  const categories = categoriesQuery.data ?? []

  const totals = categoryTotals(transactions, categories, cursor, direction)
  const total = periodTotal(transactions, cursor, direction)
  const entries = toChartEntries(totals)
  const rangeLabel = periodRangeLabel(cursor)
  const kind = cursor.kind

  const handleSelectKind = (nextKind: AnalyticsPeriodKind) => {
    setCursor(currentPeriod(nextKind))
  }
  const handlePrevPeriod = () => setCursor(shiftPeriod(cursor, -1))
  const handleNextPeriod = () => setCursor(shiftPeriod(cursor, 1))

  const chartSummary = entries
    .map((entry) => `${entry.label} ${Math.round((entry.totalMinor / total) * 100)}%`)
    .join(', ')

  return (
    <Screen testID="screen-analytics-detail" topInset={false}>
      <ScreenHeader title={view.title} />

      <ScreenScrollView>
        <View className="gap-6 px-6 pb-8">
          <View className="flex-row gap-2">
            {PERIOD_KINDS.map((option) => (
              <Button
                key={option.kind}
                variant={option.kind === kind ? 'primary' : 'outline'}
                text={option.label}
                className="flex-1"
                onPress={() => handleSelectKind(option.kind)}
                testID={option.testId}
                accessibilityState={{ selected: option.kind === kind }}
              />
            ))}
          </View>

          <View className="flex-row items-center justify-between">
            <IconButton
              testID="analytics-period-prev"
              icon="chevron-back"
              size="sm"
              accessibilityLabel="Предыдущий период"
              hitSlop={HIT_SLOP}
              onPress={handlePrevPeriod}
            />
            <Text variant="label" testID="analytics-period-label">
              {rangeLabel}
            </Text>
            <IconButton
              testID="analytics-period-next"
              icon="chevron-forward"
              size="sm"
              accessibilityLabel="Следующий период"
              hitSlop={HIT_SLOP}
              onPress={handleNextPeriod}
            />
          </View>

          {entries.length === 0 ? (
            <Card variant="elevated" testID="analytics-empty-state">
              <Text variant="body" className="text-muted-foreground">
                {view.emptyText}
              </Text>
            </Card>
          ) : (
            <>
              <View
                className="flex-row items-baseline gap-2 self-start"
                testID="analytics-detail-total"
              >
                <Text variant="h2" className="font-bold">
                  {formatAmount(total)}
                </Text>
                <Text variant="caption">всего</Text>
              </View>

              <DonutChart
                segments={entries.map((entry) => ({
                  value: entry.totalMinor,
                  color: entry.color,
                }))}
                size={240}
                strokeWidth={26}
                accessibilityLabel={`${view.title} по категориям: ${chartSummary}`}
              >
                <Text variant="label" className="px-6 text-center uppercase text-muted-foreground">
                  {rangeLabel.toUpperCase()}
                </Text>
              </DonutChart>

              <Card variant="elevated" className="gap-4" testID="analytics-category-list">
                <View className="flex-row items-center gap-3" testID="analytics-total-row">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Icon name="checkmark" size={18} colorClassName="accent-foreground" />
                  </View>
                  <Text variant="body" className="flex-1 font-semibold">
                    {view.allLabel}
                  </Text>
                  <View className="items-end">
                    <Text variant="body" className="font-semibold">
                      {formatAmount(total)}
                    </Text>
                    <Text variant="caption">100%</Text>
                  </View>
                </View>
                {totals.map(({ category, totalMinor }) => (
                  <View
                    key={category.id}
                    className="flex-row items-center gap-3"
                    testID={`analytics-category-${category.id}`}
                  >
                    <View
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <Text variant="body" className="flex-1">
                      {category.name}
                    </Text>
                    <View className="items-end">
                      <Text variant="body" className="font-semibold">
                        {formatAmount(totalMinor)}
                      </Text>
                      <Text variant="caption">{percentLabel(totalMinor, total)}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            </>
          )}
        </View>
      </ScreenScrollView>
    </Screen>
  )
}
