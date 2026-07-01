import type { Account } from '@/entities/account/types'
import { useLocalStorageRef, type LocalStorageSerializer } from './local-storage-adapter'
import { parseAccountsStorage, serializeAccountsStorage } from '@/entities/account/account'
import type {
  AccountRepository,
  CreateAccountPayload,
  UpdateAccountPayload,
} from '../account-repository'
import { STORAGE_KEYS } from './storage-keys'
import { generateId } from '@/shared/lib/generate-id'

const serializer: LocalStorageSerializer<Account[]> = {
  read: parseAccountsStorage,
  write: serializeAccountsStorage,
}

export function createLocalStorageAccountRepository(deps: {
  hasTransactionsForAccount: (accountId: string) => Promise<boolean>
}): AccountRepository {
  const items = useLocalStorageRef<Account[]>({
    storageKey: STORAGE_KEYS.accounts,
    initialValue: [],
    serializer,
  })

  return {
    async getAll() {
      return items.value.slice()
    },
    async getById(id: string) {
      return items.value.find((item) => item.id === id) ?? null
    },
    async create(payload: CreateAccountPayload) {
      const account: Account = {
        ...payload,
        id: payload.id ?? generateId(),
        manualAdjustment: 0,
      }
      items.value.push(account)
      return account
    },
    async update(id, payload: UpdateAccountPayload) {
      const target = items.value.find((item) => item.id === id)

      if (!target) {
        throw new Error(`Account with id ${id} not found`)
      }

      return Object.assign(target, payload)
    },
    async remove(id) {
      if (await deps.hasTransactionsForAccount(id)) {
        return false
      }
      const next = items.value.filter((item) => item.id !== id)
      if (next.length === items.value.length) {
        return false
      }

      items.value = next
      return true
    },
    async hasReferencingTransactions(accountId) {
      return deps.hasTransactionsForAccount(accountId)
    },
  }
}
