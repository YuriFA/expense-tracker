import {
  type Account,
  type AccountWithBalance,
  type AccountRepository,
  type CreateAccountPayload,
  type UpdateAccountPayload,
  NotFoundError,
  ReferentialIntegrityError,
  generateId,
  normalizeAccount,
} from '@expense-tracker/api'
import {
  getAccountsBalances,
  getComputedAccountBalance,
  type TransactionImpact,
} from '@expense-tracker/money'
import type { Database } from '@shared/services/database'

interface AccountRow {
  id: string
  name: string
  currency: string
  opening_balance: number
  manual_adjustment: number
}

interface Dependencies {
  /** Whether any transaction references the account (drives 409 *_IN_USE). */
  hasTransactionsForAccount: (accountId: string) => Promise<boolean>
  /** Every transaction, for integer balance computation. */
  getAllTransactions: () => Promise<TransactionImpact[]>
}

function rowToAccount(row: AccountRow): Account {
  // Re-validate through the shared normalizer so the typed currency (and the
  // rest of the shape) is guaranteed, not assumed from the SQL column.
  const account = normalizeAccount({
    id: row.id,
    name: row.name,
    currency: row.currency,
    openingBalance: row.opening_balance,
    manualAdjustment: row.manual_adjustment,
  })
  if (!account) {
    throw new Error(`Corrupt account row in database: ${row.id}`)
  }
  return account
}

/**
 * SQLite-backed `AccountRepository`. Stores accounts in the `accounts` table;
 * balances are computed with the shared integer money calculator (no floats)
 * over every transaction.
 */
export function createSQLiteAccountRepository(
  db: Database,
  deps: Dependencies,
): AccountRepository {
  return {
    async getAll(): Promise<AccountWithBalance[]> {
      const rows = await db.getAllAsync<AccountRow>('SELECT * FROM accounts')
      const transactions = await deps.getAllTransactions()
      const accounts = rows.map(rowToAccount)
      const balances = getAccountsBalances(accounts, transactions)
      return accounts.map((account) => ({
        ...account,
        balance: balances[account.id] ?? account.openingBalance + account.manualAdjustment,
      }))
    },

    async getById(id: string): Promise<AccountWithBalance | null> {
      const row = await db.getFirstAsync<AccountRow>(
        'SELECT * FROM accounts WHERE id = ?',
        id,
      )
      if (!row) {
        return null
      }
      const account = rowToAccount(row)
      const transactions = await deps.getAllTransactions()
      return { ...account, balance: getComputedAccountBalance(account, transactions) }
    },

    async create(payload: CreateAccountPayload): Promise<AccountWithBalance> {
      const account: Account = {
        id: payload.id ?? generateId(),
        name: payload.name,
        currency: payload.currency,
        openingBalance: payload.openingBalance,
        manualAdjustment: 0,
      }
      await db.runAsync(
        /* sql */ `INSERT INTO accounts (id, name, currency, opening_balance, manual_adjustment)
                   VALUES (?, ?, ?, ?, ?)`,
        account.id,
        account.name,
        account.currency,
        account.openingBalance,
        account.manualAdjustment,
      )
      return { ...account, balance: getComputedAccountBalance(account, []) }
    },

    async update(id: string, payload: UpdateAccountPayload): Promise<AccountWithBalance> {
      const existing = await db.getFirstAsync<AccountRow>(
        'SELECT * FROM accounts WHERE id = ?',
        id,
      )
      if (!existing) {
        throw new NotFoundError('Account not found')
      }

      const account = rowToAccount(existing)
      const updated: Account = {
        id: account.id,
        name: payload.name ?? account.name,
        currency: account.currency, // currency is immutable once set
        openingBalance: account.openingBalance, // opening balance is immutable
        manualAdjustment: payload.manualAdjustment ?? account.manualAdjustment,
      }

      await db.runAsync(
        /* sql */ `UPDATE accounts
                   SET name = ?, manual_adjustment = ?
                   WHERE id = ?`,
        updated.name,
        updated.manualAdjustment,
        id,
      )

      const transactions = await deps.getAllTransactions()
      return { ...updated, balance: getComputedAccountBalance(updated, transactions) }
    },

    async remove(id: string): Promise<void> {
      if (await deps.hasTransactionsForAccount(id)) {
        throw new ReferentialIntegrityError('Account has referencing transactions')
      }
      const result = await db.runAsync('DELETE FROM accounts WHERE id = ?', id)
      if (result.changes === 0) {
        throw new NotFoundError('Account not found')
      }
    },
  }
}
