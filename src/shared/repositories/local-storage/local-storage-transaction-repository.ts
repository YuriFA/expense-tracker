import type { Account } from '@/entities/account/types'
import { useLocalStorageRef, type LocalStorageSerializer } from './local-storage-adapter'
import { STORAGE_KEYS } from './storage-keys'
import type { Transaction } from '@/entities/transaction/types'
import {
  hasValidTransactionReferences,
  isTransaction,
  isTransactionLinkedToAccount,
  isTransactionLinkedToCategory,
  isTransferTransaction,
  parseTransactionsStorage,
  serializeTransactionsStorage,
} from '@/entities/transaction/transaction'
import type { Category } from '@/entities/category/types'
import type {
  CreateTransactionPayload,
  TransactionQuery,
  TransactionRepository,
  UpdateTransactionPayload,
} from '../transaction-repository'
import { getDateTimestamp, toStartOfDay } from '@/shared/lib/date'
import { generateId } from '@/shared/lib/generate-id'
import i18n from '@/app/i18n'

const serializer: LocalStorageSerializer<Transaction[]> = {
  read: parseTransactionsStorage,
  write: serializeTransactionsStorage,
}

export function createLocalStorageTransactionRepository(deps: {
  getAccounts: () => Promise<Account[]>
  getCategories: () => Promise<Category[]>
}): TransactionRepository {
  const items = useLocalStorageRef<Transaction[]>({
    storageKey: STORAGE_KEYS.transactions,
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
    async query(options: TransactionQuery = {}) {
      let result = items.value
        .slice()
        .sort((a, b) => getDateTimestamp(b.occurredAt) - getDateTimestamp(a.occurredAt))

      if (options.fromDate) {
        const from = toStartOfDay(options.fromDate).getTime()
        result = result.filter((item) => getDateTimestamp(item.occurredAt) >= from)
      }

      if (options.toDate) {
        const to = toStartOfDay(options.toDate).getTime()
        result = result.filter((item) => getDateTimestamp(item.occurredAt) <= to)
      }

      if (options.type) {
        result = result.filter((item) => item.type === options.type)
      }

      if (options.accountId) {
        const id = options.accountId
        result = result.filter((t) =>
          isTransferTransaction(t)
            ? t.fromAccountId === id || t.toAccountId === id
            : t.accountId === id,
        )
      }

      if (options.categoryId) {
        const id = options.categoryId
        result = result.filter((t) => isTransactionLinkedToCategory(t, id))
      }

      if (options.limit) {
        result = result.slice(0, options.limit)
      }

      return result
    },
    async hasTransactionsForAccount(accountId) {
      return items.value.some((t) => isTransactionLinkedToAccount(t, accountId))
    },
    async hasTransactionsForCategory(categoryId) {
      return items.value.some((t) => isTransactionLinkedToCategory(t, categoryId))
    },
    async create(payload: CreateTransactionPayload) {
      const next = {
        ...payload,
        id: payload.id ?? generateId(),
      } as unknown as Transaction
      if (!isTransaction(next)) {
        throw new Error(i18n.global.t('errors.invalidTransactionPayload'))
      }
      const [accounts, categories] = await Promise.all([deps.getAccounts(), deps.getCategories()])
      if (!hasValidTransactionReferences(next, accounts, categories)) {
        throw new Error(i18n.global.t('errors.unknownTransactionReferences'))
      }
      items.value.push(next)
      return next
    },
    async update(id, payload: UpdateTransactionPayload) {
      const existing = items.value.find((i) => i.id === id)
      if (!existing) return false
      const next = { ...payload, id } as Transaction
      if (!isTransaction(next)) return false
      const [accounts, categories] = await Promise.all([deps.getAccounts(), deps.getCategories()])
      if (!hasValidTransactionReferences(next, accounts, categories)) return false
      const index = items.value.findIndex((i) => i.id === id)
      if (index === -1) return false
      items.value[index] = next
      return true
    },
    async remove(id) {
      const next = items.value.filter((i) => i.id !== id)
      if (next.length === items.value.length) return false
      items.value = next
      return true
    },
  }
}
