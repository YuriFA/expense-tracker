import type { Transaction } from '@/entities/transaction/types'
import type { TransactionQuery } from '@/shared/repositories/transaction-repository'
import { useTransactionsStore } from '@/stores/use-transactions-store'
import { ref, watch, type Ref } from 'vue'

export function useFilteredTransactions(query: Ref<TransactionQuery>) {
  const transactions = useTransactionsStore()
  const data = ref<Transaction[]>([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  const refresh = async () => {
    isLoading.value = true
    error.value = null
    try {
      data.value = await transactions.getTransactions(query.value)
    } catch (err) {
      error.value = err as Error
    } finally {
      isLoading.value = false
    }
  }

  watch(query, refresh, { deep: true, immediate: true })

  return {
    data,
    error,
    isLoading,
    refresh,
  }
}
