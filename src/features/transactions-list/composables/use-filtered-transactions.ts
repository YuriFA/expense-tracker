import type { TransactionQuery } from '@/shared/repositories/transaction-repository'
import { useTransactionsStore } from '@/stores/use-transactions-store'
import { useAsyncState } from '@vueuse/core'
import { watch, type Ref } from 'vue'

export function useFilteredTransactions(query: Ref<TransactionQuery>) {
  const transactions = useTransactionsStore()
  const { state, isLoading, isReady, error, executeImmediate } = useAsyncState(
    () => transactions.getTransactions(query.value),
    [],
  )

  watch(query, executeImmediate, { deep: 1 })
  watch(() => transactions.items, executeImmediate)

  return {
    data: state,
    isLoading,
    isReady,
    error,
  }
}
