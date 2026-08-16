import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Screen } from '@/shared/ui/screen'
import { useAccounts } from '@/entities/account/model/use-accounts'
import { useCategories } from '@/entities/category/model/use-categories'
import { useTransactions } from '@/entities/transaction/model/use-transactions'
import { currentMonth, nextMonth, previousMonth, type MonthCursor } from '../model/selectors'
import { QuickActionsRow } from './quick-actions-row'
import { SummaryCard } from './summary-card'
import { AllExpensesCard } from './all-expenses-card'
import { CategorySection } from './category-section'

export function DashboardScreen() {
  const [cursor, setCursor] = useState<MonthCursor>(() => currentMonth())

  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()
  const transactionsQuery = useTransactions()
  const accounts = accountsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const transactions = transactionsQuery.data ?? []

  const goPrev = () => setCursor(previousMonth(cursor))
  const goNext = () => setCursor(nextMonth(cursor))

  return (
    <Screen testID="screen-dashboard">
      <ScrollView>
        <View className="p-6 gap-6">
          <QuickActionsRow />
          <SummaryCard
            cursor={cursor}
            accounts={accounts}
            transactions={transactions}
            onPrevPeriod={goPrev}
            onNextPeriod={goNext}
          />
          <AllExpensesCard cursor={cursor} transactions={transactions} categories={categories} />
          <CategorySection cursor={cursor} transactions={transactions} categories={categories} />
        </View>
      </ScrollView>
    </Screen>
  )
}
