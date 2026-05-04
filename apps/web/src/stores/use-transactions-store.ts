import { defineStore } from 'pinia'
import { computed } from 'vue'

import { useStorage } from '@vueuse/core'
import { APP_NAME } from '@/app/config'
import type { Transaction, TransactionType } from '@/types/transaction'
import {
  hasValidTransactionReferences,
  isTransaction,
  isTransferTransaction,
  parseTransactionsStorage,
  serializeTransactionsStorage,
} from '@/entities/transaction'
import { generateId } from '@/shared/lib/generate-id'
import i18n from '@/app/i18n'
import { useAccountsStore } from './use-accounts-store'
import { useCategoriesStore } from './use-categories-store'

const TRANSACTIONS_STORAGE_KEY = `${APP_NAME}:transactions`

type GetRecentTransactionsOptions = {
  limit?: number
  type?: TransactionType
  accountId?: string
}

export const useTransactionsStore = defineStore('transactions', () => {
  const accountsStore = useAccountsStore()
  const categoriesStore = useCategoriesStore()
  const items = useStorage<Transaction[]>(TRANSACTIONS_STORAGE_KEY, [], localStorage, {
    serializer: {
      read: parseTransactionsStorage,
      write: serializeTransactionsStorage,
    },
  })

  const incomeTransactions = computed(() => items.value.filter((item) => item.type === 'income'))
  const expenseTransactions = computed(() => items.value.filter((item) => item.type === 'expense'))
  const transferTransactions = computed(() =>
    items.value.filter((item) => item.type === 'transfer'),
  )

  const sortedTransactions = computed(() =>
    items.value
      .slice()
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()),
  )
  const getTransactions = (options: GetRecentTransactionsOptions = {}) => {
    let result = sortedTransactions.value

    if (options.type) {
      result = result.filter((transaction) => transaction.type === options.type)
    }

    if (options.accountId) {
      result = result.filter((transaction) =>
        isTransferTransaction(transaction)
          ? transaction.fromAccountId === options.accountId ||
            transaction.toAccountId === options.accountId
          : options.accountId === transaction.accountId,
      )
    }

    if (options.limit) {
      return result.slice(0, options.limit)
    }

    return result
  }

  const findById = (id: string) => items.value.find((item) => item.id === id)

  const hasValidReferences = (transaction: Transaction) => {
    return hasValidTransactionReferences(transaction, accountsStore.items, categoriesStore.items)
  }

  const addTransaction = <T extends Transaction>(payload: Omit<T, 'id'> & Partial<Pick<T, 'id'>>) => {
    const nextTransaction = {
      ...payload,
      id: payload.id ?? generateId(),
    }

    if (!isTransaction(nextTransaction)) {
      throw new Error(i18n.global.t('errors.invalidTransactionPayload'))
    }

    if (!hasValidReferences(nextTransaction)) {
      throw new Error(i18n.global.t('errors.unknownTransactionReferences'))
    }

    items.value.push(nextTransaction)

    return nextTransaction
  }

  const updateTransaction = (id: string, payload: Omit<Transaction, 'id'>) => {
    const transaction = findById(id)

    if (!transaction) {
      return false
    }

    const nextTransaction = {
      ...payload,
      id,
    }

    if (!isTransaction(nextTransaction)) {
      return false
    }

    if (!hasValidReferences(nextTransaction)) {
      return false
    }

    const index = items.value.findIndex((item) => item.id === id)

    if (index === -1) {
      return false
    }

    items.value[index] = nextTransaction

    return true
  }

  const removeTransaction = (id: string) => {
    const nextItems = items.value.filter((item) => item.id !== id)

    if (nextItems.length === items.value.length) {
      return false
    }

    items.value = nextItems

    return true
  }

  return {
    items,
    incomeTransactions,
    expenseTransactions,
    transferTransactions,
    getTransactions,
    findById,
    addTransaction,
    updateTransaction,
    removeTransaction,
  }
})
