import { useState } from 'react'
import { ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Stack } from '@/shared/ui'
import {
  MOCK_ACCOUNTS,
  MOCK_CATEGORIES,
  MOCK_TRANSACTIONS,
  type MockCashflowType,
  type MockCategory,
  type MockTransaction,
} from '../model/mock-data'
import { formatAmount, monthRangeLabel, relativeDayLabel } from '../model/format'
import {
  categoryBreakdown,
  currentMonth,
  expensesInMonth,
  isCurrentOrFutureMonth,
  latestExpense,
  monthlyBalance,
  nextMonth,
  previousMonth,
  totalBalance,
  totalExpenses,
  type MonthCursor,
} from '../model/selectors'
import { QuickActionsRow, type QuickActionId } from './QuickActionsRow'
import { SummaryCard } from './SummaryCard'
import { AllExpensesCard } from './AllExpensesCard'
import type { LatestExpenseView } from './AllExpensesCard.types'
import { CategorySection } from './CategorySection'
import { ModeSheet, type SummaryMode } from './ModeSheet'
import { ExpensesSheet, type ExpenseRowView } from './ExpensesSheet'
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

function toExpenseRow(tx: MockTransaction, categories: MockCategory[]): ExpenseRowView {
  const category = categories.find((c) => c.id === tx.categoryId)
  return {
    id: tx.id,
    description: tx.description,
    categoryName: category?.name ?? 'Без категории',
    categoryIcon: category?.icon ?? 'pricetag-outline',
    categoryColor: category?.color ?? '#A3A3A3',
    dayLabel: relativeDayLabel(tx.occurredAt),
    amountText: formatAmount(tx.amountMinor),
  }
}

/**
 * Home screen (Dashboard tab) on in-memory mock data - the UI-first step of
 * docs/product/mobile-home.md. Product behavior lives there; this is the
 * layout + local state that renders it.
 */
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

  const latest = latestExpense(MOCK_TRANSACTIONS, cursor)
  const latestView: LatestExpenseView | null = latest
    ? (() => {
        const category = categories.find((c) => c.id === latest.categoryId)
        return {
          amountText: formatAmount(latest.amountMinor),
          categoryName: category?.name ?? 'Без категории',
          categoryIcon: category?.icon ?? 'pricetag-outline',
          categoryColor: category?.color ?? '#A3A3A3',
          dayLabel: relativeDayLabel(latest.occurredAt),
        }
      })()
    : null

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
        <Stack className="p-4 gap-6">
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

          <AllExpensesCard latest={latestView} onOpen={() => setSheet({ kind: 'expenses' })} />

          <CategorySection
            rows={rows}
            hasAnyCategories={categories.length > 0}
            onNewCategory={() => setSheet({ kind: 'new-category' })}
            onCategoryPress={(categoryId) => setSheet({ kind: 'category', categoryId })}
          />
        </Stack>
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
