import { STORAGE_KEYS } from '@/shared/config/storage-keys'
import type { Transaction } from '../model/types'
import {
  type AccountRef,
  type CategoryRef,
  hasValidTransactionReferences,
  isTransaction,
  isTransactionLinkedToAccount,
  isTransactionLinkedToCategory,
  isTransferTransaction,
  parseTransactionsStorage,
  serializeTransactionsStorage,
} from '../model/transaction'
import type {
  CreateTransactionPayload,
  LocalStorageTransactionRepository,
  TransactionPage,
  TransactionQuery,
  UpdateTransactionPayload,
} from './repository'
import { getDateTimestamp, toEndOfDay, toStartOfDay } from '@/shared/lib/date'
import { generateId } from '@/shared/lib/generate-id'
import {
  createLocalStorageAdapter,
  InvalidPayloadError,
  NotFoundError,
  UnknownReferencesError,
} from '@/shared/lib/data'

const transactionsStorage = createLocalStorageAdapter<Transaction[]>(
  STORAGE_KEYS.transactions,
  [],
  {
    read: parseTransactionsStorage,
    write: serializeTransactionsStorage,
  },
)

const PAGE_SIZE = 100

export function createLocalStorageTransactionRepository(deps: {
  getAccounts: () => Promise<AccountRef[]>
  getCategories: () => Promise<CategoryRef[]>
}): LocalStorageTransactionRepository {
  const sortDescending = (items: Transaction[]) =>
    items
      .slice()
      .sort((a, b) => getDateTimestamp(b.occurredAt) - getDateTimestamp(a.occurredAt))

  const filter = (items: Transaction[], options: TransactionQuery) => {
    let result = items

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

    return result
  }

  return {
    async getAll() {
      return sortDescending(transactionsStorage.get())
    },
    async getById(id: string) {
      return transactionsStorage.get().find((item) => item.id === id) ?? null
    },
    async query(options: TransactionQuery = {}) {
      let result = sortDescending(filter(transactionsStorage.get(), options))

      if (options.limit) {
        result = result.slice(0, options.limit)
      }

      return result
    },
    async listPage(options: TransactionQuery & { cursor?: string } = {}) {
      // Cursor is an opaque offset into the already-filtered, sorted list.
      const pageSize = options.limit ?? PAGE_SIZE
      const all = sortDescending(filter(transactionsStorage.get(), options))
      const startIndex = options.cursor ? Number.parseInt(options.cursor, 10) : 0
      const safeStart = Number.isFinite(startIndex) ? startIndex : 0
      const slice = all.slice(safeStart, safeStart + pageSize)
      const nextIndex = safeStart + slice.length
      return {
        transactions: slice,
        nextCursor: nextIndex < all.length ? nextIndex.toString() : null,
      }
    },
    async hasTransactionsForAccount(accountId: string) {
      return transactionsStorage.get().some((t) => isTransactionLinkedToAccount(t, accountId))
    },
    async hasTransactionsForCategory(categoryId: string) {
      return transactionsStorage.get().some((t) => isTransactionLinkedToCategory(t, categoryId))
    },
    async create(payload: CreateTransactionPayload) {
      const next = {
        ...payload,
        id: payload.id ?? generateId(),
      } as unknown as Transaction
      if (!isTransaction(next)) {
        throw new InvalidPayloadError('Invalid transaction payload')
      }
      const [accounts, categories] = await Promise.all([deps.getAccounts(), deps.getCategories()])
      if (!hasValidTransactionReferences(next, accounts, categories)) {
        throw new UnknownReferencesError('Transaction references an unknown account or category')
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
        throw new NotFoundError('Transaction not found')
      }
      const next = { ...existing, ...payload } as Transaction
      if (!isTransaction(next)) {
        throw new InvalidPayloadError('Invalid transaction payload')
      }
      const [accounts, categories] = await Promise.all([deps.getAccounts(), deps.getCategories()])
      if (!hasValidTransactionReferences(next, accounts, categories)) {
        throw new UnknownReferencesError('Transaction references an unknown account or category')
      }
      const index = transactions.findIndex((i) => i.id === id)
      if (index === -1) {
        throw new NotFoundError('Transaction not found')
      }
      transactions[index] = next
      transactionsStorage.set(transactions)
      return next
    },
    async remove(id) {
      const transactions = transactionsStorage.get()
      const next = transactions.filter((i) => i.id !== id)
      if (next.length === transactions.length) {
        throw new NotFoundError(`Transaction not found`)
      }
      transactionsStorage.set(next)
    },
  }
}
