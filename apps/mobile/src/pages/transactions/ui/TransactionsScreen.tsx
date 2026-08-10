import { FlatList, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTransactions } from '@entities/transaction'
import { Screen, ListRow, EmptyState, ErrorState, Skeleton, Text } from '@shared/ui'
import { useSettingsStore } from '@shared/store/use-settings-store'
import { formatAmount } from '@shared/lib/format'
import { isTransferTransaction } from '@expense-tracker/api'

/**
 * Transactions screen placeholder for the full-history view (filters, swipe
 * actions, edit sheets come in a later task). It already reads from the local
 * repository via TanStack Query so the loading/empty/error states and the
 * offline read path are exercised end to end.
 */
export function TransactionsScreen() {
  const { t } = useTranslation()
  const { data: transactions, isLoading, isError, refetch } = useTransactions()
  const locale = useSettingsStore((s) => s.locale)

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.skeleton}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={48} style={{ marginBottom: 8 }} />
          ))}
        </View>
      </Screen>
    )
  }

  if (isError) {
    return (
      <Screen centered>
        <ErrorState onRetry={() => void refetch()} />
      </Screen>
    )
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Screen centered>
        <EmptyState icon={<Text size="title">📝</Text>} heading={t('transactions.noTransactions')} />
      </Screen>
    )
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        onRefresh={() => void refetch()}
        refreshing={isLoading}
        renderItem={({ item }) => (
          <ListRow
            leading={<Text size="title">{isTransferTransaction(item) ? '↔️' : '•'}</Text>}
            trailing={
              <Text size="body" weight={600} tabular>
                {formatAmount(item.amount, 'USD', locale)}
              </Text>
            }
          >
            <Text size="body" weight={500}>
              {item.description || item.type}
            </Text>
            <Text size="caption" tone="muted">
              {item.occurredAt}
            </Text>
          </ListRow>
        )}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  skeleton: {
    padding: 16,
  },
})
