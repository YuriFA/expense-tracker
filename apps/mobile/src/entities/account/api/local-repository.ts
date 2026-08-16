// Local (offline-first) AccountRepository over the app's SQLite database.
//
// Balances are computed by query - opening + manual adjustment + the signed
// impact of non-deleted transactions (income +, expense -, transfer -from
// +to) - mirroring the backend's `account_contributions` view and
// @expense-tracker/money's integer math. Mutations write the row and its
// outbox operation in one transaction (design D5/D6); deletes are guarded
// against in-use and tombstone records only.

import { and, eq, isNull, or, sql } from 'drizzle-orm'
import { isCurrencyCode } from '@expense-tracker/money'
import {
  AlreadyExistsError,
  InvalidPayloadError,
  NotFoundError,
  ReferentialIntegrityError,
  type Account,
  type AccountWithBalance,
  type AccountRepository,
  type CreateAccountPayload,
  type UpdateAccountPayload,
} from '@expense-tracker/api'
import type { LocalDatabase } from '@/shared/lib/db/database'
import { enqueueOperation, removeOperationsFor } from '@/shared/lib/db/outbox'
import { accounts, transactions, type AccountRow } from '@/shared/lib/db/schema'
import { generateId } from '@/shared/lib/generate-id'

type LocalTx = Parameters<Parameters<LocalDatabase['transaction']>[0]>[0]

function toAccount(row: Omit<AccountRow, 'balance'> & { balance?: number }): Account {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency as Account['currency'],
    openingBalance: row.openingBalance,
    manualAdjustment: row.manualAdjustment,
  }
}

/** Signed per-account impact of every non-deleted transaction, aggregated -
 * the SQLite twin of the backend's `account_contributions` view. */
const contributions = sql`(select account_id, sum(signed) as total from (
  select account_id, case when type = 'income' then amount else -amount end as signed
  from transactions where deleted_at is null and type in ('income', 'expense')
  union all
  select from_account_id, -amount from transactions
  where deleted_at is null and type = 'transfer'
  union all
  select to_account_id, amount from transactions
  where deleted_at is null and type = 'transfer'
) group by account_id)`

interface AccountBalanceRow {
  id: string
  name: string
  currency: string
  opening_balance: number
  manual_adjustment: number
  balance: number
}

const balanceSelect = sql`
  select a.id, a.name, a.currency, a.opening_balance, a.manual_adjustment,
    a.opening_balance + a.manual_adjustment + coalesce(c.total, 0) as balance
  from accounts a
  left join ${contributions} c on c.account_id = a.id
`

function toAccountWithBalance(row: AccountBalanceRow): AccountWithBalance {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency as Account['currency'],
    openingBalance: row.opening_balance,
    manualAdjustment: row.manual_adjustment,
    balance: row.balance,
  }
}

function hasTransactionsForAccount(tx: LocalTx, accountId: string): boolean {
  return (
    tx
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          isNull(transactions.deletedAt),
          or(
            eq(transactions.accountId, accountId),
            eq(transactions.fromAccountId, accountId),
            eq(transactions.toAccountId, accountId),
          ),
        ),
      )
      .get() !== undefined
  )
}

function isSafeIntegerAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value)
}

export function createLocalAccountRepository(db: LocalDatabase): AccountRepository {
  return {
    async getAll() {
      const rows = db.all<AccountBalanceRow>(
        sql`${balanceSelect} where a.deleted_at is null order by a.created_at, a.id`,
      )
      return rows.map(toAccountWithBalance)
    },

    async getById(id: string) {
      const row = db.get<AccountBalanceRow>(
        sql`${balanceSelect} where a.deleted_at is null and a.id = ${id}`,
      )
      return row ? toAccountWithBalance(row) : null
    },

    async create(payload: CreateAccountPayload) {
      const name = payload.name?.trim() ?? ''
      if (!name) throw new InvalidPayloadError('Account name is required')
      if (!isCurrencyCode(payload.currency)) throw new InvalidPayloadError('Invalid currency')
      if (!isSafeIntegerAmount(payload.openingBalance)) {
        throw new InvalidPayloadError('Opening balance must be an integer amount of minor units')
      }

      const id = payload.id ?? generateId()

      return db.transaction((tx) => {
        if (tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, id)).get()) {
          throw new AlreadyExistsError('Account already exists')
        }

        const row: AccountRow = {
          id,
          name,
          currency: payload.currency,
          openingBalance: payload.openingBalance,
          manualAdjustment: 0,
          version: 1,
          serverVersion: 0,
          deletedAt: null,
          createdAt: new Date().toISOString(),
        }
        tx.insert(accounts).values(row).run()
        enqueueOperation(tx, {
          entity: 'account',
          entityId: id,
          op: 'upsert',
          payload: toAccount(row),
          baseVersion: row.serverVersion,
        })
        return { ...toAccount(row), balance: row.openingBalance + row.manualAdjustment }
      })
    },

    async update(id: string, payload: UpdateAccountPayload) {
      const hasFields = payload.name !== undefined || payload.manualAdjustment !== undefined
      if (!hasFields) throw new InvalidPayloadError('No fields to update')
      if (payload.name !== undefined && !payload.name.trim()) {
        throw new InvalidPayloadError('Account name is required')
      }
      if (
        payload.manualAdjustment !== undefined &&
        !isSafeIntegerAmount(payload.manualAdjustment)
      ) {
        throw new InvalidPayloadError('Manual adjustment must be an integer amount of minor units')
      }

      return db.transaction((tx) => {
        const row = tx.select().from(accounts).where(eq(accounts.id, id)).get()
        if (!row || row.deletedAt) throw new NotFoundError('Account not found')

        const next: AccountRow = {
          ...row,
          name: payload.name !== undefined ? payload.name.trim() : row.name,
          manualAdjustment: payload.manualAdjustment ?? row.manualAdjustment,
          version: row.version + 1,
        }
        tx.update(accounts).set(next).where(eq(accounts.id, id)).run()
        enqueueOperation(tx, {
          entity: 'account',
          entityId: id,
          op: 'upsert',
          payload: toAccount(next),
          baseVersion: row.serverVersion,
        })

        const impact = tx
          .all<{ total: number | null }>(
            sql`select total from ${contributions} where account_id = ${id}`,
          )
          .at(0)
        return {
          ...toAccount(next),
          balance: next.openingBalance + next.manualAdjustment + (impact?.total ?? 0),
        }
      })
    },

    async remove(id: string) {
      db.transaction((tx) => {
        const row = tx.select().from(accounts).where(eq(accounts.id, id)).get()
        if (!row || row.deletedAt) throw new NotFoundError('Account not found')

        if (hasTransactionsForAccount(tx, id)) {
          throw new ReferentialIntegrityError('Account has referencing transactions', {
            apiCode: 'ACCOUNT_IN_USE',
          })
        }

        if (row.serverVersion === 0) {
          // Unborn record: vanishes together with its queued operations.
          tx.delete(accounts).where(eq(accounts.id, id)).run()
          removeOperationsFor(tx, 'account', id)
        } else {
          const next = { ...row, deletedAt: new Date().toISOString(), version: row.version + 1 }
          tx.update(accounts).set(next).where(eq(accounts.id, id)).run()
          enqueueOperation(tx, {
            entity: 'account',
            entityId: id,
            op: 'delete',
            payload: null,
            baseVersion: row.serverVersion,
          })
        }
      })
    },
  }
}
