import { Pressable, View } from 'react-native'
import { Card, Icon, Text } from '@/shared/ui'
import type { LatestExpenseView } from './AllExpensesCard.types'
import { MOCK_CATEGORIES, MOCK_TRANSACTIONS } from '../model/mock-data'
import { formatAmount, relativeDayLabel } from '../model/format'
import { expensesInMonth, MonthCursor, toExpenseRow } from '../model/selectors'
import { ExpensesSheet } from './ExpensesSheet'
import { useState } from 'react'

interface AllExpensesCardProps {
  cursor: MonthCursor
}

export function AllExpensesCard({ cursor }: AllExpensesCardProps) {
  const [open, setOpen] = useState(false)
  const lastTransaction = MOCK_TRANSACTIONS[MOCK_TRANSACTIONS.length - 1]
  const category = MOCK_CATEGORIES.find((c) => c.id === lastTransaction.categoryId)
  const latest: LatestExpenseView = {
    amountText: formatAmount(lastTransaction.amountMinor),
    categoryName: category?.name ?? 'Без категории',
    categoryIcon: category?.icon ?? 'pricetag-outline',
    categoryColor: category?.color ?? '#A3A3A3',
    dayLabel: relativeDayLabel(lastTransaction.occurredAt),
  }

  const sheetRows = expensesInMonth(MOCK_TRANSACTIONS, cursor).map((t) =>
    toExpenseRow(t, MOCK_CATEGORIES),
  )

  return (
    <>
      <Pressable
        testID="home-all-expenses"
        accessibilityRole="button"
        accessibilityLabel={`Все расходы, последний ${latest.categoryName}`}
        className="active:opacity-70"
        onPress={() => {
          setOpen(true)
        }}
      >
        <Card variant="default" className="bg-emerald-100">
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
                <Icon name="chevron-forward" size={18} color="#737373" />
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
        visible={open}
        title="Все расходы"
        rows={sheetRows}
        emptyText="В этом месяце расходов нет"
        onClose={() => setOpen(false)}
      />
    </>
  )
}
