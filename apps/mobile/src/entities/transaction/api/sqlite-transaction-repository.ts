import {
  type AccountRef,
  type CategoryRef,
  type CreateTransactionPayload,
  type LocalStorageTransactionRepository,
  type Transaction,
  type TransactionPage,
  type TransactionQuery,
  type UpdateTransactionPayload,
  hasValidTransactionReferences,
  isTransaction,
  isTransactionLinkedToAccount,
  isTransactionLinkedToCategory,
  isTransferTransaction,
  normalizeTransaction,
  InvalidPayloadError,
  NotFoundError,
  UnknownReferencesError,
  generateId,
} from '@expense-tracker/api'
import type { Database } from '@shared/services/database'
import type { SQLiteBindValue } from 'expo-sqlite'

interface TransactionRow {
  id: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  description: string
  occurred_at: string
  updated_at: string | null
  version: number
  account_id: string | null
  category_id: string | null
  from_account_id: string | null
  to_account_id: string | null
}

interface Dependencies {
  /** Every account (id + currency), for transfer-currency validation. */
  getAccounts: () => Promise<AccountRef[]>
  /** Every category (id + type), for type-mismatch validation. */
  getCategories: () => Promise<CategoryRef[]>
}

const ORDER_BY = 'occurred_at DESC, id DESC'
const DEFAULT_PAGE_SIZE = 100

function rowToTransaction(value: TransactionRow): Transaction {
  // Columns are snake_case; the shared normalizer expects camelCase and
  // re-validates types + referential shape, so we route through it.
  const candidate = {
    id: value.id,
    type: value.type,
    amount: value.amount,
    description: value.description ?? '',
    occurredAt: value.occurred_at,
    ...(value.updated_at ? { updatedAt: value.updated_at } : {}),
    version: value.version,
    accountId: value.account_id ?? undefined,
    categoryId: value.category_id ?? undefined,
    fromAccountId: value.from_account_id ?? undefined,
    toAccountId: value.to_account_id ?? undefined,
  }
  const transaction = isTransaction(candidate) ? candidate : null
  if (!transaction) {
    throw new InvalidPayloadError('Invalid transaction row')
  }
  return transaction
}

interface BuiltQuery {
  where: string
  params: SQLiteBindValue[]
}

function buildFilter(options: TransactionQuery): BuiltQuery {
  const clauses: string[] = []
  const params: unknown[] = []

  if (options.type) {
    clauses.push('type = ?')
    params.push(options.type)
  }

  if (options.accountId) {
    // Cashflow stores account_id; transfer spans from/to. Match either.
    clauses.push(
      '(account_id = ? OR from_account_id = ? OR to_account_id = ?)',
    )
    params.push(options.accountId, options.accountId, options.accountId)
  }

  if (options.categoryId) {
    clauses.push('category_id = ?')
    params.push(options.categoryId)
  }

  if (options.fromDate) {
    clauses.push('date(occurred_at) >= date(?)')
    params.push(options.fromDate)
  }

  if (options.toDate) {
    clauses.push('date(occurred_at) <= date(?)')
    params.push(options.toDate)
  }

  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params: params as SQLiteBindValue[] }
}

function transactionToRow(transaction: Transaction): TransactionRow {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    description: transaction.description ?? '',
    occurred_at: transaction.occurredAt,
    updated_at: transaction.updatedAt ?? null,
    version: transaction.version,
    account_id: isTransferTransaction(transaction) ? null : transaction.accountId,
    category_id: isTransferTransaction(transaction) ? null : transaction.categoryId,
    from_account_id: isTransferTransaction(transaction) ? transaction.fromAccountId : null,
    to_account_id: isTransferTransaction(transaction) ? transaction.toAccountId : null,
  }
}

/**
 * SQLite-backed `LocalStorageTransactionRepository`. Filters + cursor pagination
 * are real SQL (`WHERE`, `ORDER BY occurred_at DESC`, `LIMIT`/`OFFSET`); the
 * cursor is an opaque offset into the filtered stream, mirroring the web/local
 * contract. Referential validation reuses the shared helpers so the rules match
 * the backend and the HTTP impl exactly.
 */
export function createSQLiteTransactionRepository(
  db: Database,
  deps: Dependencies,
): LocalStorageTransactionRepository {
  return {
    async getAll(): Promise<Transaction[]> {
      const rows = await db.getAllAsync<TransactionRow>(
        `SELECT * FROM transactions ORDER BY ${ORDER_BY}`,
      )
      return rows.map(rowToTransaction)
    },

    async getById(id: string): Promise<Transaction | null> {
      const row = await db.getFirstAsync<TransactionRow>(
        'SELECT * FROM transactions WHERE id = ?',
        id,
      )
      return row ? rowToTransaction(row) : null
    },

    async query(options: TransactionQuery = {}): Promise<Transaction[]> {
      const { where, params } = buildFilter(options)
      const limit = options.limit
      if (limit !== undefined) {
        const rows = await db.getAllAsync<TransactionRow>(
          `SELECT * FROM transactions ${where} ORDER BY ${ORDER_BY} LIMIT ?`,
          [...params, limit],
        )
        return rows.map(rowToTransaction)
      }
      const rows = await db.getAllAsync<TransactionRow>(
        `SELECT * FROM transactions ${where} ORDER BY ${ORDER_BY}`,
        params,
      )
      return rows.map(rowToTransaction)
    },

    async listPage(
      options: TransactionQuery & { cursor?: string } = {},
    ): Promise<TransactionPage> {
      const { where, params } = buildFilter(options)
      const pageSize = options.limit ?? DEFAULT_PAGE_SIZE
      const startIndex = options.cursor ? Number.parseInt(options.cursor, 10) : 0
      const offset = Number.isFinite(startIndex) ? startIndex : 0

      const rows = await db.getAllAsync<TransactionRow>(
        `SELECT * FROM transactions ${where} ORDER BY ${ORDER_BY} LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      const nextIndex = offset + rows.length
      return {
        transactions: rows.map(rowToTransaction),
        nextCursor: nextIndex < offset + pageSize ? null : nextIndex.toString(),
      }
    },

    async hasTransactionsForAccount(accountId: string): Promise<boolean> {
      const row = await db.getFirstAsync<{ c: number }>(
        'SELECT COUNT(*) AS c FROM transactions WHERE account_id = ? OR from_account_id = ? OR to_account_id = ?',
        accountId,
        accountId,
        accountId,
      )
      return Boolean(row && row.c > 0)
    },

    async hasTransactionsForCategory(categoryId: string): Promise<boolean> {
      const row = await db.getFirstAsync<{ c: number }>(
        'SELECT COUNT(*) AS c FROM transactions WHERE category_id = ?',
        categoryId,
      )
      return Boolean(row && row.c > 0)
    },

    async create(payload: CreateTransactionPayload): Promise<Transaction> {
      // Route through the shared domain normalizer so a freshly created row is
      // assigned the optimistic-concurrency starting `version = 1` (the design
      // contract; see normalizeBaseTransaction). `CreateTransactionPayload`
      // intentionally omits `version` - it is server/store-owned - so a raw
      // `as Transaction` cast would leave it undefined. The INSERT below lists
      // `version` explicitly, so it would bind SQL NULL and trip the NOT NULL
      // constraint on transactions.version (SQLite's DEFAULT 1 only applies
      // when the column is omitted from the INSERT list, which it is not).
      const next = normalizeTransaction({ ...payload, id: payload.id ?? generateId() })
      if (!next) {
        throw new InvalidPayloadError('Invalid transaction payload')
      }
      const [accounts, categories] = await Promise.all([deps.getAccounts(), deps.getCategories()])
      if (!hasValidTransactionReferences(next, accounts, categories)) {
        throw new UnknownReferencesError(
          'Transaction references an unknown account or category',
        )
      }

      const row = transactionToRow(next)
      await db.runAsync(
        /* sql */ `INSERT INTO transactions
                     (id, type, amount, description, occurred_at, updated_at, version,
                      account_id, category_id, from_account_id, to_account_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        row.id,
        row.type,
        row.amount,
        row.description,
        row.occurred_at,
        row.updated_at,
        row.version,
        row.account_id,
        row.category_id,
        row.from_account_id,
        row.to_account_id,
      )
      return next
    },

    async update(id: string, payload: UpdateTransactionPayload): Promise<Transaction> {
      const existingRow = await db.getFirstAsync<TransactionRow>(
        'SELECT * FROM transactions WHERE id = ?',
        id,
      )
      if (!existingRow) {
        throw new NotFoundError('Transaction not found')
      }

      const existing = rowToTransaction(existingRow)
      const next = { ...existing, ...payload } as Transaction
      if (!isTransaction(next)) {
        throw new InvalidPayloadError('Invalid transaction payload')
      }
      const [accounts, categories] = await Promise.all([deps.getAccounts(), deps.getCategories()])
      if (!hasValidTransactionReferences(next, accounts, categories)) {
        throw new UnknownReferencesError(
          'Transaction references an unknown account or category',
        )
      }

      const row = transactionToRow(next)
      await db.runAsync(
        /* sql */ `UPDATE transactions
                     SET type = ?, amount = ?, description = ?, occurred_at = ?,
                         updated_at = ?, version = ?, account_id = ?, category_id = ?,
                         from_account_id = ?, to_account_id = ?
                   WHERE id = ?`,
        row.type,
        row.amount,
        row.description,
        row.occurred_at,
        row.updated_at,
        row.version,
        row.account_id,
        row.category_id,
        row.from_account_id,
        row.to_account_id,
        id,
      )
      return next
    },

    async remove(id: string): Promise<void> {
      const result = await db.runAsync('DELETE FROM transactions WHERE id = ?', id)
      if (result.changes === 0) {
        throw new NotFoundError('Transaction not found')
      }
    },
  }
}

// Re-export for consumers that import link predicates alongside the factory.
export { isTransactionLinkedToAccount, isTransactionLinkedToCategory }
