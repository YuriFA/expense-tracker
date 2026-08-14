import { useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Screen } from '@/shared/ui'
import {
  MOCK_ACCOUNTS,
  MOCK_CATEGORIES,
  MOCK_TRANSACTIONS,
  type MockCashflowType,
  type MockCategory,
} from '../model/mock-data'
import { formatAmount, monthRangeLabel } from '../model/format'
import {
  categoryBreakdown,
  currentMonth,
  expensesInMonth,
  isCurrentOrFutureMonth,
  monthlyBalance,
  nextMonth,
  previousMonth,
  toExpenseRow,
  totalBalance,
  totalExpenses,
  type MonthCursor,
} from '../model/selectors'
import { QuickActionsRow } from './quick-actions-row'
import { SummaryCard } from './summary-card'
import { AllExpensesCard } from './all-expenses-card'
import { CategorySection } from './category-section'
import { type SummaryMode } from './mode-sheet'
import { ExpensesSheet } from './expenses-sheet'
import { NewCategorySheet } from './new-category-sheet'
import { BottomSheetRef } from '@/shared/ui/bottom-sheet'

// TODO(i18n): RU strings are hardcoded until react-i18next is wired.
const MODE_TITLES: Record<SummaryMode, string> = {
  expenses: 'Расходы',
  'monthly-balance': 'Баланс за месяц',
  'total-balance': 'Баланс общий',
}

export function DashboardScreen() {
  const [cursor, setCursor] = useState<MonthCursor>(() => currentMonth())
  const [mode, setMode] = useState<SummaryMode>('expenses')
  const [categories, setCategories] = useState<MockCategory[]>(MOCK_CATEGORIES)
  const [categoryExpensesId, setCategoryExpensesId] = useState<string | undefined>(undefined)
  const newCategorySheetRef = useRef<BottomSheetRef>(null)
  const expensesSheetRef = useRef<BottomSheetRef>(null)

  // Period is a page-global filter: it drives every period-dependent section.
  const canGoNext = !isCurrentOrFutureMonth(cursor)
  const goPrev = () => setCursor(previousMonth(cursor))
  const goNext = () => {
    if (canGoNext) setCursor(nextMonth(cursor))
  }

  const amountText =
    mode === 'expenses'
      ? formatAmount(totalExpenses(MOCK_TRANSACTIONS, cursor))
      : mode === 'monthly-balance'
        ? formatAmount(monthlyBalance(MOCK_TRANSACTIONS, cursor))
        : formatAmount(totalBalance(MOCK_ACCOUNTS, MOCK_TRANSACTIONS))

  const rows = categoryBreakdown(MOCK_TRANSACTIONS, categories, cursor)

  const sheetCategory = categoryExpensesId
    ? categories.find((c) => c.id === categoryExpensesId)
    : undefined
  const sheetRows = categoryExpensesId
    ? expensesInMonth(MOCK_TRANSACTIONS, cursor)
        .filter((t) => t.categoryId === categoryExpensesId)
        .map((t) => toExpenseRow(t, categories))
    : expensesInMonth(MOCK_TRANSACTIONS, cursor).map((t) => toExpenseRow(t, categories))

  const addCategory = (name: string, type: MockCashflowType) => {
    setCategories((prev) => [
      ...prev,
      { id: `cat-${Date.now()}`, name, type, icon: 'pricetag-outline', color: '#6366F1' },
    ])
    newCategorySheetRef.current?.dismiss()
  }

  return (
    <Screen testID="screen-dashboard">
      <ScrollView>
        <View className="p-6 gap-6">
          <QuickActionsRow />

          <SummaryCard
            mode={mode}
            title={MODE_TITLES[mode]}
            amountText={amountText}
            periodLabel={monthRangeLabel(cursor.year, cursor.month)}
            canGoNext={canGoNext}
            onModeChange={setMode}
            onPrevPeriod={goPrev}
            onNextPeriod={goNext}
          />

          <AllExpensesCard cursor={cursor} />

          <CategorySection
            rows={rows}
            hasAnyCategories={categories.length > 0}
            onNewCategory={() => newCategorySheetRef.current?.present()}
            onCategoryPress={(categoryId) => {
              setCategoryExpensesId(categoryId)
              expensesSheetRef.current?.present()
            }}
          />
        </View>
      </ScrollView>

      <ExpensesSheet
        ref={expensesSheetRef}
        title={sheetCategory?.name ?? 'Категория'}
        rows={sheetRows}
        emptyText="В этом месяце расходов нет"
      />

      <NewCategorySheet ref={newCategorySheetRef} onSubmit={addCategory} />
    </Screen>
  )
}
