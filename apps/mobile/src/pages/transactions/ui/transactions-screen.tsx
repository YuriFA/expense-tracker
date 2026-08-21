// Transactions tab: a minimal month-scoped list of all transaction types
// (income, expense, transfer) from local data, with month navigation.

import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import type { Category, Transaction } from '@expense-tracker/api'
import { Screen } from '@/shared/ui/screen'
import { Card } from '@/shared/ui/card'
import { Icon, type IconName } from '@/shared/ui/icon'
import { IconButton } from '@/shared/ui/icon-button'
import { Text } from '@/shared/ui/text'
import { cn } from '@/shared/lib/utils'
import {
  currentMonth,
  monthRangeLabel,
  nextMonth,
  previousMonth,
  relativeDayLabel,
  transactionsInMonth,
  type MonthCursor,
} from '@expense-tracker/dates'
import { formatAmount } from '@/shared/lib/format/format'
import { useCategories } from '@/entities/category'
import { useTransactions } from '@/entities/transaction'

const TYPE_ICONS: Record<Transaction['type'], IconName> = {
  income: 'arrow-down',
  expense: 'arrow-up',
  transfer: 'swap-horizontal',
}

function TransactionRow({
  transaction,
  categories,
}: {
  transaction: Transaction
  categories: Category[]
}) {
  const category =
    transaction.type !== 'transfer'
      ? categories.find((c) => c.id === transaction.categoryId)
      : undefined

  const title =
    transaction.type === 'transfer'
      ? 'Перевод'
      : transaction.description || category?.name || 'Без категории'
  const subtitle =
    transaction.type === 'transfer' ? 'Перевод между счетами' : (category?.name ?? '')

  const amountText = formatAmount(transaction.amount)
  const amountClassName =
    transaction.type === 'income'
      ? 'text-success'
      : transaction.type === 'expense'
        ? 'text-foreground'
        : 'text-muted-foreground'
  const sign = transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '−' : ''

  return (
    <View className="flex-row items-center gap-4" testID={`tx-row-${transaction.id}`}>
      <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Icon name={TYPE_ICONS[transaction.type]} size={18} colorClassName="accent-foreground" />
      </View>
      <View className="flex-1 gap-1">
        <Text variant="body" className="text-foreground">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" className="text-muted-foreground">
            {subtitle} · {relativeDayLabel(transaction.occurredAt)}
          </Text>
        ) : (
          <Text variant="caption" className="text-muted-foreground">
            {relativeDayLabel(transaction.occurredAt)}
          </Text>
        )}
      </View>
      <Text variant="body" className={cn('font-semibold', amountClassName)}>
        {sign}
        {amountText}
      </Text>
    </View>
  )
}

export function TransactionsScreen() {
  const [cursor, setCursor] = useState<MonthCursor>(() => currentMonth())

  const transactionsQuery = useTransactions()
  const categoriesQuery = useCategories()
  const transactions = transactionsQuery.data ?? []
  const categories = categoriesQuery.data ?? []

  const monthTransactions = transactionsInMonth(transactions, cursor)

  return (
    <Screen testID="screen-transactions">
      <ScrollView>
        <View className="p-6 gap-6">
          <View className="flex-row items-center justify-between">
            <Text variant="display">Транзакции</Text>
            <View className="flex-row items-center gap-1">
              <IconButton
                testID="tx-month-prev"
                icon="chevron-back"
                size="sm"
                accessibilityLabel="Предыдущий месяц"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => setCursor(previousMonth(cursor))}
              />
              <Text variant="caption">{monthRangeLabel(cursor.year, cursor.month)}</Text>
              <IconButton
                testID="tx-month-next"
                icon="chevron-forward"
                size="sm"
                accessibilityLabel="Следующий месяц"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => setCursor(nextMonth(cursor))}
              />
            </View>
          </View>

          {monthTransactions.length === 0 ? (
            <Card variant="elevated">
              <Text variant="body" className="text-muted-foreground">
                В этом месяце транзакций нет
              </Text>
              <Text variant="body-sm" className="mt-1 text-muted-foreground">
                Добавьте расход или доход через кнопку «+»
              </Text>
            </Card>
          ) : (
            <Card variant="elevated">
              <View className="gap-4">
                {monthTransactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    categories={categories}
                  />
                ))}
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}
