import { Alert, View, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import {
  Text,
  Skeleton,
  EmptyState,
  ErrorState,
  SwipeableRow,
  useTokens,
  type SwipeAction,
} from '@shared/ui'
import {
  TransactionListItem,
  useRecentTransactions,
  useDeleteTransaction,
  type Transaction,
} from '@entities/transaction'
import { useAccounts } from '@entities/account'
import { useCategories } from '@entities/category'

const RECENT_LIMIT = 5

interface RecentTransactionsProps {
  /** Open the edit sheet for the tapped/swiped transaction (managed by Home). */
  onEditTransaction: (transaction: Transaction) => void
}

/**
 * The recent-transactions list that sits beneath the Home input form (design
 * section 7). Uses the canonical state vocabulary - skeleton while loading,
 * EmptyState when there is nothing yet (it teaches, with the input visible
 * above), ErrorState + retry on failure - and optimistic swipe-to-delete + tap
 * / swipe-to-edit via the shared `SwipeableRow` and `TransactionListItem`.
 *
 * Updates instantly after a save because `useCreateTransaction` writes the
 * provisional row into every cached list optimistically.
 */
export function RecentTransactions({ onEditTransaction }: RecentTransactionsProps) {
  const { t } = useTranslation()
  const tokens = useTokens()
  const recent = useRecentTransactions(RECENT_LIMIT)
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
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
    <View style={styles.container}>
      <Text size="label" weight={600} tone="muted" style={styles.title}>
        {t('recentTransactions.title')}
      </Text>

      {recent.isLoading ? (
        <View style={styles.list}>
          {Array.from({ length: RECENT_LIMIT }).map((_, index) => (
            <SkeletonRow key={index} />
          ))}
        </View>
      ) : recent.isError ? (
        <ErrorState onRetry={() => void recent.refetch()} />
      ) : recent.data && recent.data.length > 0 ? (
        <View style={styles.list}>
          {recent.data.map((transaction, index) => (
            <View
              key={transaction.id}
              style={[
                styles.item,
                index < recent.data!.length - 1
                  ? { borderBottomColor: tokens.border, borderBottomWidth: StyleSheet.hairlineWidth }
                  : null,
              ]}
            >
              <SwipeableRow rightActions={buildActions(transaction)}>
                <PressableRow onPress={() => onEditTransaction(transaction)}>
                  <TransactionListItem
                    transaction={transaction}
                    accounts={accounts}
                    categories={categories}
                  />
                </PressableRow>
              </SwipeableRow>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState
          icon={<Ionicons name="receipt-outline" size={40} color={tokens.mutedForeground} />}
          heading={t('home.emptyTitle')}
          description={t('home.emptyDescription')}
        />
      )}
    </View>
  )
}

/** Tappable wrapper so tap-to-edit works without disrupting the swipe affordance. */
function PressableRow({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
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

function SkeletonRow() {
  return (
    <View style={skeletonStyles.row}>
      <Skeleton circle width={32} height={32} />
      <View style={skeletonStyles.text}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={64} height={16} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {},
  list: {},
  item: {
    paddingLeft: 0,
    paddingRight: 8,
  },
})

const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  text: {
    flex: 1,
  },
})
