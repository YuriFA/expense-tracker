import { useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { monthToUtcDayRange } from '@expense-tracker/dates'
import { Screen } from '@/shared/ui/screen'
import { useAccounts } from '@/entities/account'
import { useCategories } from '@/entities/category'
import { useTransactions } from '@/entities/transaction'
import { SyncStatusBadge } from '@/widgets/sync-status'
import { NewTransactionSheet } from '@/features/create-transaction'
import {
  AllCashflowCard,
  CASHFLOW_KIND_VIEWS,
  CategorySection,
  currentMonth,
  nextMonth,
  previousMonth,
  type MonthCursor,
} from '@/features/cashflow-overview'
import type { BottomSheetRef } from '@/shared/ui/bottom-sheet'
import { DashboardSummaryCard } from './dashboard-summary-card'
import { QuickActionsRow } from './quick-actions-row'

export function DashboardScreen() {
  const [cursor, setCursor] = useState<MonthCursor>(() => currentMonth())
  const { ids } = CASHFLOW_KIND_VIEWS.expense

  // The new-transaction sheets used to live inside the cashflow feature's
  // sheets; the page composes them now (invariant #15 - no cross-slice
  // feature imports), keeping each origin's Maestro testID.
  const listNewTransactionRef = useRef<BottomSheetRef>(null)
  const categoryNewTransactionRef = useRef<BottomSheetRef>(null)
  const [prefillCategoryId, setPrefillCategoryId] = useState<string | undefined>(undefined)

  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()
  // Month-bounded superset (UTC days covering the local month): children trim
  // to the exact local month via the shared selectors.
  const transactionsQuery = useTransactions(monthToUtcDayRange(cursor))
  const accounts = accountsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const transactions = transactionsQuery.data ?? []

  const goPrev = () => setCursor(previousMonth(cursor))
  const goNext = () => setCursor(nextMonth(cursor))

  const openListNewTransaction = () => {
    listNewTransactionRef.current?.present()
  }
  const openCategoryNewTransaction = (categoryId: string | undefined) => {
    setPrefillCategoryId(categoryId)
    categoryNewTransactionRef.current?.present()
  }

  return (
    <Screen testID="screen-dashboard">
      <ScrollView>
        <View className="p-6 gap-6">
          <SyncStatusBadge />
          <QuickActionsRow />
          <DashboardSummaryCard
            cursor={cursor}
            accounts={accounts}
            transactions={transactions}
            onPrevPeriod={goPrev}
            onNextPeriod={goNext}
          />
          <AllCashflowCard
            kind="expense"
            cursor={cursor}
            transactions={transactions}
            categories={categories}
            onNewTransaction={openListNewTransaction}
          />
          <CategorySection
            kind="expense"
            cursor={cursor}
            transactions={transactions}
            categories={categories}
            onNewTransaction={openCategoryNewTransaction}
          />
        </View>
      </ScrollView>

      <NewTransactionSheet
        ref={listNewTransactionRef}
        kind="expense"
        testID={ids.newTransactionSheet}
      />
      <NewTransactionSheet
        ref={categoryNewTransactionRef}
        kind="expense"
        defaultCategoryId={prefillCategoryId}
        testID={ids.categoryNewTransactionSheet}
      />
    </Screen>
  )
}
