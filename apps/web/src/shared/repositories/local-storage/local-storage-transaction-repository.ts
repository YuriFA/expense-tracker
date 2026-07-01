import type { Account } from '@/entities/account/types'
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
import { getDateTimestamp, toEndOfDay, toStartOfDay } from '@/shared/lib/date'
import { generateId } from '@/shared/lib/generate-id'
import i18n from '@/app/i18n'
import { createLocalStorageAdapter } from './local-storage-adapter'

const transactionsStorage = createLocalStorageAdapter<Transaction[]>(STORAGE_KEYS.transactions, [], {
  read: parseTransactionsStorage,
  write: serializeTransactionsStorage,
})


export function createLocalStorageTransactionRepository(deps: {
  getAccounts: () => Promise<Account[]>
  getCategories: () => Promise<Category[]>
}): TransactionRepository {
  return {
    async getAll() {
      return transactionsStorage.get().slice()
    },
    async getById(id: string) {
      return transactionsStorage.get().find((item) => item.id === id) ?? null
    },
    async query(options: TransactionQuery = {}) {
      let result = transactionsStorage.get()
        .slice()
        .sort((a, b) => getDateTimestamp(b.occurredAt) - getDateTimestamp(a.occurredAt))

      if (options.fromDate) {
        const from = toStartOfDay(options.fromDate).getTime()
        result = result.filter((item) => getDateTimestamp(item.occurredAt) >= from)
      }

      if (options.toDate) {
        const to = toEndOfDay(options.toDate).getTime()
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
      return transactionsStorage.get().some((t) => isTransactionLinkedToAccount(t, accountId))
    },
    async hasTransactionsForCategory(categoryId) {
      return transactionsStorage.get().some((t) => isTransactionLinkedToCategory(t, categoryId))
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
      const transactions = transactionsStorage.get()
      transactions.push(next)
      transactionsStorage.set(transactions)
      return next
    },
    async update(id, payload: UpdateTransactionPayload) {
      const transactions = transactionsStorage.get()
      const existing = transactions.find((i) => i.id === id)
      if (!existing) {
        throw new Error(i18n.global.t('errors.transactionNotFound'))
      }
      const next = { ...payload, id } as Transaction
      if (!isTransaction(next)) {
        throw new Error(i18n.global.t('errors.invalidTransactionPayload'))
      }
      const [accounts, categories] = await Promise.all([deps.getAccounts(), deps.getCategories()])
      if (!hasValidTransactionReferences(next, accounts, categories)) {
        throw new Error(i18n.global.t('errors.unknownTransactionReferences'))
      }
      const index = transactions.findIndex((i) => i.id === id)
      if (index === -1) {
        throw new Error(i18n.global.t('errors.transactionNotFound'))
      }
      transactions[index] = next
      transactionsStorage.set(transactions)
      return next
    },
    async remove(id) {
      const transactions = transactionsStorage.get()
      const next = transactions.filter((i) => i.id !== id)
      if (next.length === transactions.length) return false
      transactionsStorage.set(next)
      return true
    },
  }
}
