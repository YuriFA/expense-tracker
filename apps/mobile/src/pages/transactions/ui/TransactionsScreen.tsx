import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Button, EmptyState, ErrorState, Screen, Skeleton, useTokens } from '@shared/ui'
import {
  useTransactions,
  type Transaction,
} from '@entities/transaction'
import { useAccounts } from '@entities/account'
import { useCategories } from '@entities/category'
import { TransactionEditSheet } from '@features/transaction/edit'
import { useTransactionFilters } from '../model/use-transaction-filters'
import { TransactionsList } from './TransactionsList'
import { ActiveFilterChips } from './ActiveFilterChips'
import { TransactionFilterSheet } from './TransactionFilterSheet'

const SKELETON_ROWS = 8

/**
 * The Transactions tab - the full history (design section 7). A virtualized
 * list of every transaction, filtered live by type / account / category / date
 * range through a `BottomSheet`. Active filters render as removable chips;
 * tapping a row edits it in the shared `TransactionEditSheet`; swiping reveals
 * quick edit/delete. Offline-first: the local repository resolves the active
 * filter query instantly and TanStack Query keeps the cache + pull-to-refresh.
 *
 * States follow the canonical vocabulary: skeleton on the first load,
 * EmptyState (which teaches) when there is nothing to show, ErrorState + retry
 * on failure.
 */
export function TransactionsScreen() {
  const { t } = useTranslation()
  const tokens = useTokens()
  const router = useRouter()

  const filterState = useTransactionFilters()
  const { data: transactions, isLoading, isError, isFetching, refetch } =
    useTransactions(filterState.query)
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()

  const [filterSheetVisible, setFilterSheetVisible] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const refreshing = isFetching && !isLoading
  const isEmpty = !isLoading && !isError && (transactions?.length ?? 0) === 0

  return (
    <Screen padded={false}>
      <FilterBar
        activeCount={filterState.activeCount}
        onOpenFilter={() => setFilterSheetVisible(true)}
      />

      {filterState.activeCount > 0 ? (
        <ActiveFilterChips
          filters={filterState.filters}
          accounts={accounts}
          categories={categories}
          onClear={filterState.clearFilter}
        />
      ) : null}

      <View style={styles.body}>
        {isLoading ? (
          <SkeletonList />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : isEmpty ? (
          <EmptyState
            icon={
              <Ionicons name="receipt-outline" size={40} color={tokens.mutedForeground} />
            }
            heading={
              filterState.isUnfiltered
                ? t('transactions.emptyTitle')
                : t('transactions.noMatchesTitle')
            }
            description={
              filterState.isUnfiltered
                ? t('transactions.emptyDescription')
                : t('transactions.noMatchesDescription')
            }
            actionLabel={
              filterState.isUnfiltered
                ? t('transactions.emptyAction')
                : t('transactions.noMatchesAction')
            }
            onAction={() =>
              filterState.isUnfiltered
                ? router.navigate('/')
                : filterState.resetAll()
            }
          />
        ) : (
          <TransactionsList
            transactions={transactions ?? []}
            accounts={accounts}
            categories={categories}
            onEditTransaction={setEditingTransaction}
            onRefresh={() => void refetch()}
            refreshing={refreshing}
          />
        )}
      </View>

      <TransactionFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        filters={filterState.filters}
        accounts={accounts}
        categories={categories}
        onTypeChange={filterState.setType}
        onAccountChange={filterState.setAccountId}
        onCategoryChange={filterState.setCategoryId}
        onDateRangeChange={filterState.setDateRange}
        onReset={filterState.resetAll}
      />

      {editingTransaction ? (
        <TransactionEditSheet
          transaction={editingTransaction}
          visible={Boolean(editingTransaction)}
          onClose={() => setEditingTransaction(null)}
        />
      ) : null}
    </Screen>
  )
}

/** Sticky filter trigger; shows the active-filter count when any are set. */
function FilterBar({
  activeCount,
  onOpenFilter,
}: {
  activeCount: number
  onOpenFilter: () => void
}) {
  const { t } = useTranslation()
  const label =
    activeCount > 0
      ? `${t('transactions.filter')} (${activeCount})`
      : t('transactions.filter')

  return (
    <View style={styles.filterBar}>
      <Button variant="outline" onPress={onOpenFilter}>
        {label}
      </Button>
    </View>
  )
}

/** Skeleton placeholder list matching the real row height. */
function SkeletonList() {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
        <SkeletonRow key={index} />
      ))}
    </View>
  )
}

function SkeletonRow() {
  const tokens = useTokens()
  return (
    <View
      style={[
        styles.skeletonRow,
        { borderBottomColor: tokens.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <Skeleton width={28} height={28} />
      <View style={styles.skeletonText}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="35%" height={12} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={64} height={16} />
    </View>
  )
}

const styles = StyleSheet.create({
  filterBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  body: {
    flex: 1,
  },
  skeletonList: {
    paddingVertical: 4,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  skeletonText: {
    flex: 1,
  },
})
