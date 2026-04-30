import { defineStore } from 'pinia'

import { useStorage } from '@vueuse/core'
import { APP_NAME } from '@/app/config'
import type { Account } from '@/types/account'
import type { Transaction } from '@/types/transaction'
import {
  getComputedAccountBalance,
  parseAccountsStorage,
  serializeAccountsStorage,
} from '@/entities/account'
import { generateId } from '@/shared/lib/generate-id'
import { isTransactionLinkedToAccount, parseTransactionsStorage } from '@/entities/transaction'

const ACCOUNTS_STORAGE_KEY = `${APP_NAME}:accounts`
const TRANSACTIONS_STORAGE_KEY = `${APP_NAME}:transactions`

export const useAccountsStore = defineStore('accounts', () => {
  const items = useStorage<Account[]>(ACCOUNTS_STORAGE_KEY, [], localStorage, {
    serializer: {
      read: parseAccountsStorage,
      write: serializeAccountsStorage,
    },
  })

  const findById = (id: string) => items.value.find((item) => item.id === id)

  const addAccount = (payload: Omit<Account, 'id'> & Partial<Pick<Account, 'id'>>) => {
    const account: Account = {
      ...payload,
      id: payload.id ?? generateId(),
    }

    items.value.push(account)

    return account
  }

  const updateAccount = (id: string, payload: Partial<Omit<Account, 'id'>>) => {
    const account = findById(id)

    if (!account) {
      return false
    }

    Object.assign(account, payload)

    return true
  }

  const removeAccount = (id: string) => {
    const transactions = parseTransactionsStorage(localStorage.getItem(TRANSACTIONS_STORAGE_KEY) ?? '[]')

    if (transactions.some((transaction) => isTransactionLinkedToAccount(transaction, id))) {
      return false
    }

    const nextItems = items.value.filter((item) => item.id !== id)

    if (nextItems.length === items.value.length) {
      return false
    }

    items.value = nextItems

    return true
  }

  const getAccountBalance = (accountId: string, transactions: Transaction[]) => {
    const account = findById(accountId)

    if (!account) {
      return null
    }

    return getComputedAccountBalance(account, transactions)
  }

  return {
    items,
    findById,
    addAccount,
    updateAccount,
    removeAccount,
    getAccountBalance,
  }
})
