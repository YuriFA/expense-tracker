import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
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
import { QuickActionsRow, type QuickActionId } from './QuickActionsRow'
import { SummaryCard } from './SummaryCard'
import { AllExpensesCard } from './AllExpensesCard'
import { CategorySection } from './CategorySection'
import { ModeSheet, type SummaryMode } from './ModeSheet'
import { ExpensesSheet } from './ExpensesSheet'
import { NewCategorySheet } from './NewCategorySheet'

// TODO(i18n): RU strings are hardcoded until react-i18next is wired.
const MODE_TITLES: Record<SummaryMode, string> = {
  expenses: 'Расходы',
  'monthly-balance': 'Баланс за месяц',
  'total-balance': 'Баланс общий',
}

type SheetState =
  | { kind: 'none' }
  | { kind: 'mode' }
  | { kind: 'expenses' }
  | { kind: 'category'; categoryId: string }
  | { kind: 'new-category' }

export function DashboardScreen() {
  const router = useRouter()

  const [cursor, setCursor] = useState<MonthCursor>(() => currentMonth())
  const [mode, setMode] = useState<SummaryMode>('expenses')
  const [categories, setCategories] = useState<MockCategory[]>(MOCK_CATEGORIES)
  const [sheet, setSheet] = useState<SheetState>({ kind: 'none' })

  const closeSheet = () => setSheet({ kind: 'none' })

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

  const sheetCategory =
    sheet.kind === 'category' ? categories.find((c) => c.id === sheet.categoryId) : undefined
  const sheetRows =
    sheet.kind === 'category'
      ? expensesInMonth(MOCK_TRANSACTIONS, cursor)
          .filter((t) => t.categoryId === sheet.categoryId)
          .map((t) => toExpenseRow(t, categories))
      : expensesInMonth(MOCK_TRANSACTIONS, cursor).map((t) => toExpenseRow(t, categories))

  const onQuickAction = (id: QuickActionId) => {
    if (id === 'accounts') router.push('/accounts')
    else if (id === 'income') router.push('/income')
    else router.push('/goals')
  }

  const addCategory = (name: string, type: MockCashflowType) => {
    setCategories((prev) => [
      ...prev,
      { id: `cat-${Date.now()}`, name, type, icon: 'pricetag-outline', color: '#6366F1' },
    ])
    closeSheet()
  }

  return (
    <Screen testID="screen-dashboard">
      <ScrollView>
        <View className="p-6 gap-6">
          <QuickActionsRow onPress={onQuickAction} />

          <SummaryCard
            title={MODE_TITLES[mode]}
            amountText={amountText}
            periodLabel={monthRangeLabel(cursor.year, cursor.month)}
            canGoNext={canGoNext}
            onOpenModes={() => setSheet({ kind: 'mode' })}
            onPrevPeriod={goPrev}
            onNextPeriod={goNext}
          />

          <AllExpensesCard cursor={cursor} />

          <CategorySection
            rows={rows}
            hasAnyCategories={categories.length > 0}
            onNewCategory={() => setSheet({ kind: 'new-category' })}
            onCategoryPress={(categoryId) => setSheet({ kind: 'category', categoryId })}
          />
        </View>
      </ScrollView>

      <ModeSheet
        visible={sheet.kind === 'mode'}
        activeMode={mode}
        onSelect={(nextMode) => {
          setMode(nextMode)
          closeSheet()
        }}
        onClose={closeSheet}
      />

      <ExpensesSheet
        visible={sheet.kind === 'expenses' || sheet.kind === 'category'}
        title={sheet.kind === 'category' ? (sheetCategory?.name ?? 'Категория') : 'Все расходы'}
        rows={sheetRows}
        emptyText="В этом месяце расходов нет"
        onClose={closeSheet}
      />

      <NewCategorySheet
        visible={sheet.kind === 'new-category'}
        onSubmit={addCategory}
        onClose={closeSheet}
      />
    </Screen>
  )
}
