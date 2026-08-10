import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SwipeableRow, useTokens, type SwipeAction } from '@shared/ui'
import {
  TransactionListItem,
  useDeleteTransaction,
  type Transaction,
} from '@entities/transaction'
import type { AccountWithBalance, Category } from '@expense-tracker/api'

interface TransactionsListProps {
  transactions: Transaction[]
  /** Accounts + categories, to resolve row names/icons/currency. */
  accounts: AccountWithBalance[] | undefined
  categories: Category[] | undefined
  /** Open the edit sheet for the tapped/swiped transaction. */
  onEditTransaction: (transaction: Transaction) => void
  /** Pull-to-refresh handler. */
  onRefresh: () => void
  /** Whether a background refetch is running. */
  refreshing: boolean
}

/**
 * The virtualized transaction history (design section 7). `FlatList` only
 * mounts visible rows; each row reuses `TransactionListItem` (with the compact
 * date) wrapped in the shared `SwipeableRow` for quick actions and a tap target
 * for edit. Delete is optimistic (`useDeleteTransaction`) behind an alert
 * confirmation; pull-to-refresh re-runs the active filter query.
 *
 * The delete confirmation + action vocabulary is shared with the Home recent
 * list so the two surfaces feel identical.
 */
export function TransactionsList({
  transactions,
  accounts,
  categories,
  onEditTransaction,
  onRefresh,
  refreshing,
}: TransactionsListProps) {
  const { t } = useTranslation()
  const tokens = useTokens()
  const deleteTransaction = useDeleteTransaction()

  const confirmDelete = (transaction: Transaction) => {
    Alert.alert(
      t('deleteTransaction.confirmDelete'),
      t('deleteTransaction.confirmDeleteDescription'),
      [
        { text: t('deleteTransaction.cancel'), style: 'cancel' },
        {
          text: t('deleteTransaction.confirm'),
          style: 'destructive',
          onPress: () => deleteTransaction.mutate(transaction.id),
        },
      ],
    )
  }

  const buildActions = (transaction: Transaction): SwipeAction[] => [
    {
      label: t('editTransaction.trigger'),
      color: tokens.ink,
      onPress: () => onEditTransaction(transaction),
    },
    {
      label: t('deleteTransaction.trigger'),
      color: tokens.destructive,
      onPress: () => confirmDelete(transaction),
      accessibilityLabel: t('deleteTransaction.trigger'),
    },
  ]

  return (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <SwipeableRow rightActions={buildActions(item)}>
          <PressableRow onPress={() => onEditTransaction(item)}>
            <TransactionListItem
              transaction={item}
              accounts={accounts}
              categories={categories}
              showDate
            />
          </PressableRow>
        </SwipeableRow>
      )}
      ItemSeparatorComponent={() => <Divider />}
      onRefresh={onRefresh}
      refreshing={refreshing}
      contentContainerStyle={styles.content}
      initialNumToRender={12}
      maxToRenderPerBatch={8}
      windowSize={9}
    />
  )
}

/** Tappable wrapper so tap-to-edit works without disrupting the swipe affordance. */
function PressableRow({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
    >
      {children}
    </Pressable>
  )
}

function Divider() {
  const tokens = useTokens()
  return <View style={[styles.divider, { backgroundColor: tokens.border }]} />
}

const styles = StyleSheet.create({
  content: {
    // Rows carry their own 16px horizontal padding (edge-to-edge list); just
    // leave breathing room at the bottom so the last row clears the tab bar.
    paddingBottom: 24,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
})
