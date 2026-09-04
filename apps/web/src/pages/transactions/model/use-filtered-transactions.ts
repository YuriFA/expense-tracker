import { computed } from 'vue'
import { useTransactions } from '@/entities/transaction'
import { useTransactionsFilters } from './use-transactions-filters'
import { matchesTransactionsFilters } from '../lib/transactions-query'

/**
 * The transactions the screen currently shows: the repository query keyed by
 * the single-select filters (type + date range), narrowed client-side by the
 * multi-select account/category checkboxes. One source of truth for the list
 * and the header's filtered CSV export.
 */
export function useFilteredTransactions() {
  const { filters } = useTransactionsFilters()
  // Multi-select account/category narrowing happens client-side over this
  // base query: the repository seam stays single-select (shared with mobile),
  // and the base list is cache-stable while the checkbox selection changes.
  const repositoryQuery = computed(() => ({
    type: filters.value.type,
    fromDate: filters.value.fromDate,
    toDate: filters.value.toDate,
  }))
  const { data, error, isPending, refetch } = useTransactions(repositoryQuery)

  const visibleTransactions = computed(() =>
    (data.value ?? []).filter((transaction) =>
      matchesTransactionsFilters(transaction, filters.value),
    ),
  )

  return { visibleTransactions, error, isPending, refetch }
}
