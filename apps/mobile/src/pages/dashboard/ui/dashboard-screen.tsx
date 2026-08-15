import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Screen } from '@/shared/ui'
import { currentMonth, nextMonth, previousMonth, type MonthCursor } from '../model/selectors'
import { QuickActionsRow } from './quick-actions-row'
import { SummaryCard } from './summary-card'
import { AllExpensesCard } from './all-expenses-card'
import { CategorySection } from './category-section'

export function DashboardScreen() {
  const [cursor, setCursor] = useState<MonthCursor>(() => currentMonth())

  const goPrev = () => setCursor(previousMonth(cursor))
  const goNext = () => setCursor(nextMonth(cursor))

  return (
    <Screen testID="screen-dashboard">
      <ScrollView>
        <View className="p-6 gap-6">
          <QuickActionsRow />
          <SummaryCard cursor={cursor} onPrevPeriod={goPrev} onNextPeriod={goNext} />
          <AllExpensesCard cursor={cursor} />
          <CategorySection cursor={cursor} />
        </View>
      </ScrollView>
    </Screen>
  )
}
