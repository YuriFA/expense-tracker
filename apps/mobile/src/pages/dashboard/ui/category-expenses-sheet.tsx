// Category expense sheet (reference redesign): close/edit header, an
// in-sheet month navigator (own cursor - the dashboard month is only the
// opening state), the period total, a newest/oldest sort toggle, and the
// expenses grouped by day with per-day totals. The footer pill stacks the
// expense-creation sheet with this category preselected. Data comes from the
// sheet's own repository query filtered by category + expense type + a UTC
// day range covering the in-sheet month; the dashboard selectors then trim
// that superset to the exact local month, so the sheet's list and total
// converge with the dashboard's category breakdown.
//
// The sheet stays mounted even without a category (it just shows fallback
// content): present() is called from the category row in the same tick that
// selects the category, so the ref must already be attached.

import { Fragment, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import Animated from 'react-native-reanimated'
import type { Category } from '@expense-tracker/api'
import { monthToUtcDayRange } from '@expense-tracker/dates'
import { NewTransactionSheet } from '@/features/create-transaction'
import { useTransactions } from '@/entities/transaction/model/use-transactions'
import { Icon } from '@/shared/ui/icon'
import { IconButton } from '@/shared/ui/icon-button'
import { Text } from '@/shared/ui/text'
import { cn } from '@/shared/lib/utils'
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetHeader,
  BottomSheetRef,
  BottomSheetScrollView,
} from '@/shared/ui/bottom-sheet'
import { formatAmount, monthRangeLabelShort } from '../model/format'
import {
  expenseDayGroups,
  nextMonth,
  previousMonth,
  totalExpenses,
  type ExpenseDayGroup,
  type MonthCursor,
} from '../model/selectors'
import { EditCategorySheet } from './edit-category-sheet'
import { ExpenseSheetFooter } from './expense-sheet-footer'
import { useSheetFooterScroll } from './use-sheet-footer-scroll'

export interface CategoryExpensesSheetProps {
  ref: React.Ref<BottomSheetRef>
  /** The category whose expenses are listed; falls back to neutral content. */
  category: Category | undefined
  categories: Category[]
  /** The month the sheet opens on; the in-sheet navigator takes over after. */
  initialCursor: MonthCursor
  emptyText: string
}

const AnimatedBottomSheetScrollView = Animated.createAnimatedComponent(BottomSheetScrollView)

/** Newest-first groups flipped to oldest-first, rows included. */
function reverseGroups(groups: ExpenseDayGroup[]): ExpenseDayGroup[] {
  return groups
    .slice()
    .reverse()
    .map((group) => ({ ...group, rows: group.rows.slice().reverse() }))
}

export function CategoryExpensesSheet({
  category,
  categories,
  initialCursor,
  emptyText,
  ref,
}: CategoryExpensesSheetProps) {
  const [cursor, setCursor] = useState(initialCursor)
  const [sortAscending, setSortAscending] = useState(false)
  const newExpenseSheetRef = useRef<BottomSheetRef>(null)
  const editCategorySheetRef = useRef<BottomSheetRef>(null)
  const { scrollHandler, buttonTranslationY } = useSheetFooterScroll()

  const categoryQuery = useTransactions(
    { type: 'expense', categoryId: category?.id, ...monthToUtcDayRange(cursor) },
    { enabled: category !== undefined },
  )

  // Depends on `categoryQuery.data` (a stable reference per fetch), not a
  // `?? []` fallback computed at render time.
  const { groups, totalText } = useMemo(() => {
    const categoryTransactions = categoryQuery.data ?? []
    return {
      groups: expenseDayGroups(categoryTransactions, categories, cursor),
      totalText: formatAmount(totalExpenses(categoryTransactions, cursor)),
    }
  }, [categoryQuery.data, categories, cursor])
  const orderedGroups = sortAscending ? reverseGroups(groups) : groups
  const periodLabel = monthRangeLabelShort(cursor.year, cursor.month)

  const handleEdit = () => {
    editCategorySheetRef.current?.present()
  }

  const handleNewExpense = () => {
    newExpenseSheetRef.current?.present()
  }

  // Every presentation starts at the dashboard's month: the in-sheet
  // navigation is ephemeral per open, not a lasting selection.
  const handleSheetChange = (index: number) => {
    if (index >= 0) setCursor(initialCursor)
  }

  return (
    <>
      <BottomSheet
        ref={ref}
        snapPoints={['90%']}
        stackBehavior="push"
        testID="category-expenses-sheet"
        onChange={handleSheetChange}
        footerComponent={(props) => (
          <ExpenseSheetFooter
            {...props}
            testID="category-new-expense-button"
            buttonTranslationY={buttonTranslationY}
            onNewExpensePress={handleNewExpense}
          />
        )}
      >
        <BottomSheetHeader
          title={category?.name ?? 'Категория'}
          right={
            <IconButton
              icon="create-outline"
              size="md"
              accessibilityLabel="Редактировать категорию"
              testID="category-expenses-edit"
              onPress={handleEdit}
            />
          }
        />

        <View className="flex-row items-center justify-between px-4 py-2">
          <IconButton
            icon="chevron-back"
            size="sm"
            accessibilityLabel="Предыдущий месяц"
            testID="category-expenses-prev-month"
            onPress={() => setCursor((current) => previousMonth(current))}
          />
          <Text
            variant="body-sm"
            className="font-medium text-foreground"
            testID="category-expenses-period"
          >
            {periodLabel}
          </Text>
          <IconButton
            icon="chevron-forward"
            size="sm"
            accessibilityLabel="Следующий месяц"
            testID="category-expenses-next-month"
            onPress={() => setCursor((current) => nextMonth(current))}
          />
        </View>

        <AnimatedBottomSheetScrollView testID="category-expenses-sheet" onScroll={scrollHandler}>
          <BottomSheetBody className="gap-6 pt-2 pb-32">
            {/* TODO(i18n): RU wording until mobile i18n wiring lands. */}
            <Text variant="caption" testID="category-expenses-total">
              {totalText} потрачено
            </Text>

            <View className="flex-row items-center justify-between">
              <Text variant="button" className="font-medium text-foreground">
                Все расходы
              </Text>
              <IconButton
                icon={sortAscending ? 'arrow-up' : 'arrow-down'}
                size="sm"
                accessibilityLabel={sortAscending ? 'Сначала старые' : 'Сначала новые'}
                testID="category-expenses-sort"
                onPress={() => setSortAscending((value) => !value)}
              />
            </View>

            {orderedGroups.length === 0 ? (
              <Text variant="body" className="text-muted-foreground">
                {emptyText}
              </Text>
            ) : (
              orderedGroups.map((group) => (
                <View
                  key={group.key}
                  className="gap-3"
                  testID={`category-expense-day-${group.key}`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text variant="button" className="font-medium text-foreground">
                      {group.title}
                    </Text>
                    <Text variant="button" className="text-muted-foreground">
                      {group.totalText}
                    </Text>
                  </View>

                  {group.rows.map((row, index) => (
                    <Fragment key={row.id}>
                      {index > 0 ? <View className="h-px bg-border/10" /> : null}
                      <View
                        className="flex-row items-center gap-4"
                        testID={`category-expense-row-${row.id}`}
                      >
                        <View
                          className={cn(
                            'h-10 w-10 items-center justify-center rounded-full',
                            row.categoryColor ? undefined : 'bg-muted',
                          )}
                          style={
                            row.categoryColor ? { backgroundColor: row.categoryColor } : undefined
                          }
                        >
                          <Icon name={row.categoryIcon} size={20} colorClassName="accent-white" />
                        </View>
                        <Text variant="body" className="flex-1 text-foreground" numberOfLines={1}>
                          {row.description || row.categoryName}
                        </Text>
                        <Text variant="button">{row.amountText}</Text>
                      </View>
                    </Fragment>
                  ))}
                </View>
              ))
            )}
          </BottomSheetBody>
        </AnimatedBottomSheetScrollView>
      </BottomSheet>

      <NewTransactionSheet
        ref={newExpenseSheetRef}
        kind="expense"
        defaultCategoryId={category?.id}
        testID="category-new-expense-sheet"
      />

      <EditCategorySheet ref={editCategorySheetRef} category={category} />
    </>
  )
}
