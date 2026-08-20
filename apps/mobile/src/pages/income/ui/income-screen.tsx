import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { monthToUtcDayRange } from '@expense-tracker/dates'
import { useCategories } from '@/entities/category/model/use-categories'
import { useTransactions } from '@/entities/transaction/model/use-transactions'
import {
  AllCashflowCard,
  CategorySection,
  SummaryCard,
  currentMonth,
  nextMonth,
  previousMonth,
  totalCashflow,
  type MonthCursor,
} from '@/features/cashflow-overview'
import { Screen } from '@/shared/ui/screen'
import { IconButton } from '@/shared/ui/icon-button'
import { formatAmount } from '@/shared/lib/format/format'

/**
 * Income screen: the dashboard's month-scoped composition mirrored for
 * income only (openspec mobile-local-data "Income screen data behavior").
 * A stack destination without the tab bar, so the header carries the back
 * affordance. The summary is a fixed «Доходы» title with the month income
 * total — no balance modes; transactions and categories are income-scoped
 * at the query level.
 */
export function IncomeScreen() {
  const router = useRouter()
  const [cursor, setCursor] = useState<MonthCursor>(() => currentMonth())

  // Month-bounded superset (UTC days covering the local month) filtered to
  // income by the repository; children trim to the exact local month via the
  // shared selectors.
  const transactionsQuery = useTransactions({ type: 'income', ...monthToUtcDayRange(cursor) })
  const categoriesQuery = useCategories('income')
  const transactions = transactionsQuery.data ?? []
  const categories = categoriesQuery.data ?? []

  const goPrev = () => setCursor(previousMonth(cursor))
  const goNext = () => setCursor(nextMonth(cursor))

  return (
    <Screen testID="screen-income">
      <ScrollView>
        <View className="p-6 gap-6">
          <View className="flex-row items-center justify-between">
            <IconButton
              testID="income-back"
              icon="chevron-back"
              accessibilityLabel="Назад"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => router.back()}
            />
          </View>

          <SummaryCard
            title="Доходы"
            amountText={formatAmount(totalCashflow(transactions, cursor, 'income'))}
            cursor={cursor}
            onPrevPeriod={goPrev}
            onNextPeriod={goNext}
            testIDPrefix="income"
          />
          <AllCashflowCard
            kind="income"
            cursor={cursor}
            transactions={transactions}
            categories={categories}
          />
          <CategorySection
            kind="income"
            cursor={cursor}
            transactions={transactions}
            categories={categories}
          />
        </View>
      </ScrollView>
    </Screen>
  )
}
