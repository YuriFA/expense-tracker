import { defineStore } from 'pinia'

import type { Account, AccountWithBalance } from '@/entities/account/types'
import { getRepositories } from '@/shared/repositories/repository-factory'
import { useAsyncState } from '@vueuse/core'
import { watch } from 'vue'
import { useTransactionsStore } from './use-transactions-store'

export const useAccountsStore = defineStore('accounts', () => {
  const repository = getRepositories().accounts
  const transactionsStore = useTransactionsStore()
  const {
    state: items,
    isLoading,
    isReady,
    executeImmediate,
  } = useAsyncState<AccountWithBalance[]>(() => repository.getAll(), [])

  watch(() => transactionsStore.items, executeImmediate)

  const findById = (id: string) => items.value.find((item) => item.id === id)

  const addAccount = async (
    payload: Omit<Account, 'id' | 'manualAdjustment'> & Partial<Pick<Account, 'id'>>,
  ) => {
    const created = await repository.create(payload)
    items.value = [...items.value, created]
    return created
  }

  const updateAccount = async (id: string, payload: Partial<Omit<Account, 'id'>>) => {
    const updated = await repository.update(id, payload)
    items.value = items.value.map((item) => (item.id === id ? updated : item))
  }

  const removeAccount = async (id: string) => {
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
    findById,
    addAccount,
    updateAccount,
    removeAccount,
  }
})
