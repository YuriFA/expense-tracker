// Analytics detail: the period-scoped (week/month/year) expense or income
// breakdown by category for one direction (design D5-D7, D10). One
// parametrized screen, not two: the direction changes only copy and the
// query's type filter. The chart is interactive: tapping a segment selects
// its category (scaled segment, dimmed siblings, row moved to top), row
// checkboxes include/exclude categories from the chart (renormalized among
// the included; the list always shows full-period figures), and tapping a
// row drills into that category via the shared period-aware cashflow sheet.
// Periods step via the flanking arrows or a swipe over the chart, sliding
// the period content like a carousel in the step direction. A period
// without movement renders the SAME composition with zero figures (neutral
// empty ring, every direction category listed at 0) - no separate empty
// state. Every period change resets selection and filtering.
// TODO(i18n): RU copy stays hardcoded until react-i18next is wired (see
// apps/mobile/AGENTS.md §i18n).

import { useRef, useState } from 'react'
import { View } from 'react-native'
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
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
  OTHER_ENTRY_COLOR,
  categoryTotals,
  percentLabel,
  periodTotal,
  type AnalyticsDirection,
  type CategoryTotal,
} from '@/features/analytics'
import { CASHFLOW_KIND_VIEWS, CategoryCashflowSheet } from '@/features/cashflow-overview'
import { NewTransactionSheet } from '@/features/create-transaction'
import { useCategories } from '@/entities/category'
import { useTransactions } from '@/entities/transaction'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Icon } from '@/shared/ui/icon'
import { IconButton } from '@/shared/ui/icon-button'
import { Pressable } from '@/shared/ui/pressable'
import { Screen } from '@/shared/ui/screen'
import { ScreenHeader, ScreenScrollView } from '@/shared/ui/screen-header'
import { Text } from '@/shared/ui/text'
import type { BottomSheetRef } from '@/shared/ui/bottom-sheet'
import { cn } from '@/shared/lib/utils'
import { formatAmount } from '@/shared/lib/format/format'

const PERIOD_KINDS: Array<{ kind: AnalyticsPeriodKind; label: string; testId: string }> = [
  { kind: 'week', label: 'Неделя', testId: 'analytics-period-week' },
  { kind: 'month', label: 'Месяц', testId: 'analytics-period-month' },
  { kind: 'year', label: 'Год', testId: 'analytics-period-year' },
]

const DIRECTION_VIEWS: Record<AnalyticsDirection, { title: string; allLabel: string }> = {
  expense: { title: 'Расходы', allLabel: 'Все расходы' },
  income: { title: 'Доходы', allLabel: 'Все доходы' },
}

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 }
const CHART_SIZE = 216
const CHART_STROKE = 24
const SLIDE_DURATION_MS = 250

/**
 * Round checkbox controlling chart inclusion. Category rows pass their
 * color: the circle is category-colored and the checkmark carries the state
 * (unchecked dims). The master toggle keeps the neutral primary/border look.
 */
function ChartCheckbox({
  checked,
  onToggle,
  testID,
  label,
  color,
}: {
  checked: boolean
  onToggle: () => void
  testID: string
  label: string
  color?: string
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onToggle}
      className={cn(
        'h-6 w-6 items-center justify-center rounded-full border',
        color ? 'border-transparent' : checked ? 'border-primary bg-primary' : 'border-border',
        color && !checked && 'opacity-40',
      )}
      style={color ? { backgroundColor: color } : undefined}
    >
      {checked ? (
        <Icon
          name="checkmark"
          size={14}
          colorClassName={color ? 'accent-white' : 'accent-primary-foreground'}
        />
      ) : null}
    </Pressable>
  )
}

export interface AnalyticsDetailScreenProps {
  direction: AnalyticsDirection
}

export function AnalyticsDetailScreen({ direction }: AnalyticsDetailScreenProps) {
  const view = DIRECTION_VIEWS[direction]
  const { copy, ids } = CASHFLOW_KIND_VIEWS[direction]
  const [cursor, setCursor] = useState<PeriodCursor>(() => currentPeriod('month'))
  // Carousel direction of the LAST step (+1 forward / -1 back) drives the
  // entering/exiting slide pair.
  const [lastDirection, setLastDirection] = useState<1 | -1>(1)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined)
  const [excludedIds, setExcludedIds] = useState<ReadonlySet<string>>(() => new Set())
  const [drillDownCategoryId, setDrillDownCategoryId] = useState<string | undefined>(undefined)
  const sheetRef = useRef<BottomSheetRef>(null)
  const newTransactionRef = useRef<BottomSheetRef>(null)
  const [prefillCategoryId, setPrefillCategoryId] = useState<string | undefined>(undefined)

  const transactionsQuery = useTransactions({ type: direction, ...periodToUtcDayRange(cursor) })
  const categoriesQuery = useCategories(direction)
  const transactions = transactionsQuery.data ?? []
  const categories = categoriesQuery.data ?? []

  const total = periodTotal(transactions, cursor, direction)
  const rangeLabel = periodRangeLabel(cursor)
  const kind = cursor.kind

  // The list shows EVERY direction category (0 when without movement);
  // the chart charts the included categories with movement.
  const movementTotals = categoryTotals(transactions, categories, cursor, direction)
  const movementByCategory = new Map(
    movementTotals.map(({ category, totalMinor }) => [category.id, totalMinor]),
  )
  const allTotals: CategoryTotal[] = categories
    .map((category) => ({ category, totalMinor: movementByCategory.get(category.id) ?? 0 }))
    .sort((a, b) => b.totalMinor - a.totalMinor)

  // Every period change resets selection and filtering and remembers the
  // step direction for the carousel slide (conventions §2 - the reset lives
  // in the handlers, not in an effect).
  const applyPeriod = (next: PeriodCursor, stepDirection: 1 | -1) => {
    setCursor(next)
    setLastDirection(stepDirection)
    setSelectedCategoryId(undefined)
    setExcludedIds(new Set())
  }
  const handleSelectKind = (nextKind: AnalyticsPeriodKind) =>
    applyPeriod(currentPeriod(nextKind), 1)
  const handlePrevPeriod = () => applyPeriod(shiftPeriod(cursor, -1), -1)
  const handleNextPeriod = () => applyPeriod(shiftPeriod(cursor, 1), 1)

  const swipe = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-20, 20])
    .runOnJS(true)
    .onEnd((event) => {
      if (event.translationX < 0) handleNextPeriod()
      else if (event.translationX > 0) handlePrevPeriod()
    })

  const handleToggleCategory = (categoryId: string) => {
    if (categoryId === selectedCategoryId) setSelectedCategoryId(undefined)
    setExcludedIds((current) => {
      const next = new Set(current)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }
  const includedTotals = allTotals.filter(({ category }) => !excludedIds.has(category.id))
  const allIncluded = includedTotals.length === allTotals.length
  const handleToggleAll = () => {
    setExcludedIds(() =>
      allIncluded ? new Set(allTotals.map(({ category }) => category.id)) : new Set(),
    )
  }

  const handlePressSegment = (segmentId: string) => {
    setSelectedCategoryId((current) => (current === segmentId ? undefined : segmentId))
  }
  const handleOpenCategory = (categoryId: string) => {
    setDrillDownCategoryId(categoryId)
    sheetRef.current?.present()
  }
  const handleNewTransaction = (categoryId: string | undefined) => {
    setPrefillCategoryId(categoryId)
    newTransactionRef.current?.present()
  }

  const includedWithMovement = includedTotals.filter(({ totalMinor }) => totalMinor > 0)
  const chartSegments =
    includedWithMovement.length === 0
      ? [{ id: 'empty-period', value: 1, color: OTHER_ENTRY_COLOR }]
      : includedWithMovement.map(({ category, totalMinor }) => ({
          id: category.id,
          value: totalMinor,
          color: category.color,
        }))

  const orderedTotals = selectedCategoryId
    ? [
        ...allTotals.filter(({ category }) => category.id === selectedCategoryId),
        ...allTotals.filter(({ category }) => category.id !== selectedCategoryId),
      ]
    : allTotals

  const chartSummary =
    total > 0
      ? movementTotals
          .map(
            ({ category, totalMinor }) =>
              `${category.name} ${Math.round((totalMinor / total) * 100)}%`,
          )
          .join(', ')
      : 'нет данных за период'

  const sheetCategory = categories.find((category) => category.id === drillDownCategoryId)

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

          <View
            className="flex-row items-baseline gap-2 self-start"
            testID="analytics-detail-total"
          >
            <Text variant="h2" className="font-bold">
              {formatAmount(total)}
            </Text>
            <Text variant="caption">всего</Text>
          </View>

          {/* Only the chart slides in the step direction (carousel feel);
              the total, arrows, and breakdown stay static. */}
          <GestureDetector gesture={swipe}>
            <View className="flex-row items-center justify-between">
              <IconButton
                testID="analytics-period-prev"
                icon="chevron-back"
                size="sm"
                accessibilityLabel="Предыдущий период"
                hitSlop={HIT_SLOP}
                onPress={handlePrevPeriod}
              />
              <Animated.View
                key={`${kind}:${cursor.start.toISOString()}`}
                entering={
                  lastDirection === -1
                    ? SlideInLeft.duration(SLIDE_DURATION_MS)
                    : SlideInRight.duration(SLIDE_DURATION_MS)
                }
              >
                <DonutChart
                  segments={chartSegments}
                  size={CHART_SIZE}
                  strokeWidth={CHART_STROKE}
                  selectedSegmentId={selectedCategoryId}
                  onPressSegment={handlePressSegment}
                  accessibilityLabel={`${view.title} по категориям: ${chartSummary}`}
                >
                  <Text
                    variant="label"
                    className="px-6 text-center uppercase text-muted-foreground"
                    testID="analytics-period-label"
                  >
                    {rangeLabel.toUpperCase()}
                  </Text>
                </DonutChart>
              </Animated.View>
              <IconButton
                testID="analytics-period-next"
                icon="chevron-forward"
                size="sm"
                accessibilityLabel="Следующий период"
                hitSlop={HIT_SLOP}
                onPress={handleNextPeriod}
              />
            </View>
          </GestureDetector>

          <Card variant="elevated" className="gap-4" testID="analytics-category-list">
            <View className="flex-row items-center gap-3" testID="analytics-total-row">
              <ChartCheckbox
                checked={allIncluded}
                onToggle={handleToggleAll}
                testID="analytics-total-check"
                label={`${view.allLabel}, показывать все категории`}
              />
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
            {orderedTotals.map(({ category, totalMinor }) => (
              <Pressable
                key={category.id}
                className={cn(
                  'flex-row items-center gap-3',
                  selectedCategoryId !== undefined &&
                    category.id !== selectedCategoryId &&
                    'opacity-50',
                )}
                testID={`analytics-category-${category.id}`}
                accessibilityRole="button"
                accessibilityLabel={copy.categoryRowA11yLabel(category.name)}
                onPress={() => handleOpenCategory(category.id)}
              >
                <ChartCheckbox
                  checked={!excludedIds.has(category.id)}
                  onToggle={() => handleToggleCategory(category.id)}
                  testID={`analytics-category-check-${category.id}`}
                  label={`${category.name}, показывать на графике`}
                  color={category.color}
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
              </Pressable>
            ))}
          </Card>
        </View>
      </ScreenScrollView>

      <CategoryCashflowSheet
        ref={sheetRef}
        kind={direction}
        category={sheetCategory}
        categories={categories}
        initialPeriod={cursor}
        onNewTransaction={handleNewTransaction}
      />
      <NewTransactionSheet
        ref={newTransactionRef}
        kind={direction}
        defaultCategoryId={prefillCategoryId}
        testID={ids.categoryNewTransactionSheet}
      />
    </Screen>
  )
}
