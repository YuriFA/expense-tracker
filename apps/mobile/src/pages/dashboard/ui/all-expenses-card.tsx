import { Pressable, View } from 'react-native'
import { Card } from '@/shared/ui/card'
import { Icon } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import type { Category, Transaction } from '@expense-tracker/api'
import type { LatestExpenseView } from './all-expenses-card.types'
import { formatAmount, relativeDayLabel } from '../model/format'
import { expensesInMonth, latestExpense, MonthCursor, toExpenseRow } from '../model/selectors'
import { ExpensesSheet } from './expenses-sheet'
import { useRef } from 'react'
import { BottomSheetRef } from '@/shared/ui/bottom-sheet'

interface AllExpensesCardProps {
  cursor: MonthCursor
  transactions: Transaction[]
  categories: Category[]
}

export function AllExpensesCard({ cursor, transactions, categories }: AllExpensesCardProps) {
  const expensesSheetRef = useRef<BottomSheetRef>(null)
  const last = latestExpense(transactions, cursor)
  const lastCategory = last ? categories.find((c) => c.id === last.categoryId) : undefined
  const latest: LatestExpenseView | null = last
    ? {
        amountText: formatAmount(last.amount),
        categoryName: lastCategory?.name ?? 'Без категории',
        dayLabel: relativeDayLabel(last.occurredAt),
      }
    : null

  const sheetRows = expensesInMonth(transactions, cursor).map((t) => toExpenseRow(t, categories))

  return (
    <>
      <Pressable
        testID="home-all-expenses"
        accessibilityRole="button"
        accessibilityLabel={`Все расходы${latest ? `, последний ${latest.categoryName}` : ''}`}
        className="active:opacity-70"
        onPress={() => {
          expensesSheetRef.current?.present()
        }}
      >
        <Card variant="elevated" className="bg-success/10">
          <View className="gap-2">
            <Text variant="h4">Все расходы</Text>

            {latest ? (
              <View className="flex-row items-center gap-4">
                <View className="flex-1 gap-2">
                  <Text variant="body" className="text-muted-foreground">
                    Последний {latest.dayLabel.toLowerCase()}
                    {'\n'}
                    {latest.amountText}, {latest.categoryName}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={18} colorClassName="accent-muted-foreground" />
              </View>
            ) : (
              <View className="gap-2">
                <Text variant="body" className="text-muted-foreground">
                  Расходов нет
                </Text>
              </View>
            )}
          </View>
        </Card>
      </Pressable>

      <ExpensesSheet
        ref={expensesSheetRef}
        title="Все расходы"
        rows={sheetRows}
        emptyText="В этом месяце расходов нет"
      />
    </>
  )
}
