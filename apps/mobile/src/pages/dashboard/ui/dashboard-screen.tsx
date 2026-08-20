import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { monthToUtcDayRange } from '@expense-tracker/dates'
import { Screen } from '@/shared/ui/screen'
import { useAccounts } from '@/entities/account/model/use-accounts'
import { useCategories } from '@/entities/category/model/use-categories'
import { useTransactions } from '@/entities/transaction/model/use-transactions'
import { SyncStatusBadge } from '@/widgets/sync-status'
import {
  AllCashflowCard,
  CategorySection,
  currentMonth,
  nextMonth,
  previousMonth,
  type MonthCursor,
} from '@/features/cashflow-overview'
import { DashboardSummaryCard } from './dashboard-summary-card'
import { QuickActionsRow } from './quick-actions-row'

export function DashboardScreen() {
  const [cursor, setCursor] = useState<MonthCursor>(() => currentMonth())

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
          />
          <CategorySection
            kind="expense"
            cursor={cursor}
            transactions={transactions}
            categories={categories}
          />
        </View>
      </ScrollView>
    </Screen>
  )
}
