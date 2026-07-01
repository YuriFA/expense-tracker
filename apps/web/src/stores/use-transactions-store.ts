import { defineStore } from 'pinia'

import type { Transaction } from '@/entities/transaction/types'
import { getRepositories } from '@/shared/repositories/repository-factory'
import type {
  CreateTransactionPayload,
  TransactionQuery,
} from '@/shared/repositories/transaction-repository'
import { useAsyncState } from '@vueuse/core'

type GetTransactionsOptions = TransactionQuery

export const useTransactionsStore = defineStore('transactions', () => {
  const repository = getRepositories().transactions
  const {
    state: items,
    isLoading,
    isReady,
  } = useAsyncState<Transaction[]>(() => repository.getAll(), [])

  const getTransactions = async (options: GetTransactionsOptions = {}) => {
    return repository.query(options)
  }

  const findById = (id: string) => items.value.find((item) => item.id === id)

  const addTransaction = async <T extends Transaction>(payload: CreateTransactionPayload<T>) => {
    const created = await repository.create(payload)
    items.value = [...items.value, created]
    return created
  }

  const updateTransaction = async (id: string, payload: Omit<Transaction, 'id'>) => {
    const updated = await repository.update(id, payload)
    items.value = items.value.map((item) => (item.id === id ? updated : item))
  }

  const removeTransaction = async (id: string) => {
    const ok = await repository.remove(id)
    if (!ok) {
      return false
    }

    items.value = items.value.filter((item) => item.id !== id)
    return true
  }

  return {
    items,
    isLoading,
    isReady,
    getTransactions,
    findById,
    addTransaction,
    updateTransaction,
    removeTransaction,
  }
})
