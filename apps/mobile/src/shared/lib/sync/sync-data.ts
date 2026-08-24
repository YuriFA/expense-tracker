// Mapping between local records/payloads and the sync wire shapes
// (`AccountSyncData` / `CategorySyncData` / `TransactionSyncData` /
// `DebtorSyncData` / `DebtOperationSyncData`).
//
// The outbox stores mutations as full DOMAIN payloads (the same shape the
// repositories return); the wire `data` of an operation/change carries a
// subset (no id/version/updatedAt/slug - those live in the envelope or are
// local-only). This module is the single place that knows both directions,
// plus the row readers the engine needs for coalescing, pull applies, and
// conflict bookkeeping.

import { eq } from 'drizzle-orm'
import type {
  AccountSyncData,
  CategorySyncData,
  DebtOperationSyncData,
  DebtorSyncData,
  SyncOperationData,
  TransactionSyncData,
} from '@expense-tracker/api'
import type { LocalDatabase, LocalTransaction } from '@/shared/lib/db/database'
import {
  accounts,
  categories,
  debtOperations,
  debtors,
  transactions,
  type AccountRow,
  type CategoryRow,
  type DebtOperationRow,
  type DebtorRow,
  type SyncEntity,
  type TransactionRow,
} from '@/shared/lib/db/schema'

/** Either the raw db handle or a transaction over it (same select surface). */
export type DbLike = LocalDatabase | LocalTransaction

/** A row of any syncable entity table (tombstones included). */
export type EntityRow = AccountRow | CategoryRow | TransactionRow | DebtorRow | DebtOperationRow

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null
}

/** Reads the raw row of any syncable entity (tombstones included). */
export function readEntityRow(db: DbLike, entity: SyncEntity, id: string): EntityRow | undefined {
  switch (entity) {
    case 'account':
      return db.select().from(accounts).where(eq(accounts.id, id)).get()
    case 'category':
      return db.select().from(categories).where(eq(categories.id, id)).get()
    case 'transaction':
      return db.select().from(transactions).where(eq(transactions.id, id)).get()
    case 'debtor':
      return db.select().from(debtors).where(eq(debtors.id, id)).get()
    case 'debt_operation':
      return db.select().from(debtOperations).where(eq(debtOperations.id, id)).get()
  }
}

/** Domain payload of a row (the same shape the repositories return and the
 * outbox stores) - used for coalescing and conflict local states. */
export function rowToPayload(entity: SyncEntity, row: EntityRow): Record<string, unknown> {
  if (entity === 'account') {
    const r = row as AccountRow
    return {
      id: r.id,
      name: r.name,
      currency: r.currency,
      openingBalance: r.openingBalance,
      manualAdjustment: r.manualAdjustment,
    }
  }
  if (entity === 'category') {
    const r = row as CategoryRow
    return { id: r.id, name: r.name, type: r.type, icon: r.icon, color: r.color }
  }
  if (entity === 'debtor') {
    const r = row as DebtorRow
    return { id: r.id, name: r.name, note: r.note }
  }
  if (entity === 'debt_operation') {
    const r = row as DebtOperationRow
    return {
      id: r.id,
      debtorId: r.debtorId,
      direction: r.direction,
      kind: r.kind,
      amount: r.amount,
      note: r.note,
      occurredAt: r.occurredAt,
    }
  }
  const r = row as TransactionRow
  const base = {
    id: r.id,
    type: r.type,
    amount: r.amount,
    description: r.description,
    occurredAt: r.occurredAt,
  }
  return r.type === 'transfer'
    ? { ...base, fromAccountId: r.fromAccountId, toAccountId: r.toAccountId }
    : { ...base, accountId: r.accountId, categoryId: r.categoryId }
}

/** True when the row is tombstoned (or treated as such). */
export function isRowDeleted(row: EntityRow): boolean {
  return row.deletedAt !== null
}

/**
 * Converts a stored domain payload (outbox `payload_json`, conflict
 * `local_state_json`) into the wire `data` of an upsert operation. Returns
 * `null` when the payload does not carry the required fields - the caller
 * records the op as a local error instead of pushing garbage.
 */
export function payloadToSyncData(entity: SyncEntity, payload: unknown): SyncOperationData | null {
  const p = asRecord(payload)
  if (!p) return null

  if (entity === 'account') {
    const currency = asString(p.currency)
    const openingBalance = asInt(p.openingBalance)
    const manualAdjustment = asInt(p.manualAdjustment)
    if (
      !currency ||
      !ACCOUNT_CURRENCIES.has(currency) ||
      openingBalance === null ||
      manualAdjustment === null
    ) {
      return null
    }
    const data: AccountSyncData = {
      name: asString(p.name) ?? '',
      currency: currency as AccountSyncData['currency'],
      openingBalance,
      manualAdjustment,
    }
    return data.name ? data : null
  }

  if (entity === 'category') {
    const type = asString(p.type)
    const data = {
      name: asString(p.name) ?? '',
      type: type === 'income' || type === 'expense' ? type : null,
      icon: asString(p.icon) ?? '',
      color: asString(p.color) ?? '',
    }
    return data.name && data.type && data.icon && data.color ? (data as CategorySyncData) : null
  }

  if (entity === 'debtor') {
    const data: DebtorSyncData = {
      name: asString(p.name) ?? '',
      note: asString(p.note) ?? '',
    }
    return data.name ? data : null
  }

  if (entity === 'debt_operation') {
    const direction = asString(p.direction)
    const kind = asString(p.kind)
    if (direction !== 'receivable' && direction !== 'payable') return null
    if (kind !== 'debt' && kind !== 'repayment') return null
    const debtorId = asString(p.debtorId)
    const amount = asInt(p.amount)
    const occurredAt = asString(p.occurredAt)
    if (!debtorId || amount === null || amount < 1 || !occurredAt) return null
    const data: DebtOperationSyncData = {
      debtorId,
      direction,
      kind,
      amount,
      note: asString(p.note) ?? '',
      occurredAt,
    }
    return data
  }

  const type = asString(p.type)
  if (type !== 'income' && type !== 'expense' && type !== 'transfer') return null
  const amount = asInt(p.amount)
  if (amount === null || amount < 1) return null
  const occurredAt = asString(p.occurredAt)
  if (!occurredAt) return null

  const data: TransactionSyncData = {
    type,
    amount,
    description: asString(p.description) ?? '',
    occurredAt,
  }
  if (type === 'transfer') {
    const from = asString(p.fromAccountId)
    const to = asString(p.toAccountId)
    if (!from || !to) return null
    return { ...data, fromAccountId: from, toAccountId: to }
  }
  const account = asString(p.accountId)
  const category = asString(p.categoryId)
  if (!account || !category) return null
  return { ...data, accountId: account, categoryId: category }
}

/** Complete entity-column sets for applying a wire upsert to a local row. */
export type SyncRowPatch =
  | Pick<AccountRow, 'name' | 'currency' | 'openingBalance' | 'manualAdjustment'>
  | Pick<CategoryRow, 'name' | 'type' | 'icon' | 'color' | 'slug'>
  | Pick<
      TransactionRow,
      | 'type'
      | 'amount'
      | 'description'
      | 'occurredAt'
      | 'accountId'
      | 'categoryId'
      | 'fromAccountId'
      | 'toAccountId'
    >
  | Pick<DebtorRow, 'name' | 'note'>
  | Pick<DebtOperationRow, 'debtorId' | 'direction' | 'kind' | 'amount' | 'note' | 'occurredAt'>

const ACCOUNT_CURRENCIES = new Set(['USD', 'EUR', 'RUB'])

/**
 * Row patch (entity columns only) for a wire upsert - used by pull applies
 * and take-server conflict resolution. Assumes the wire shape is valid
 * (server-produced); returns `null` on a malformed payload all the same.
 */
export function syncDataToRowPatch(
  entity: SyncEntity,
  data: SyncOperationData,
): SyncRowPatch | null {
  const p = asRecord(data)
  if (!p) return null

  if (entity === 'account') {
    const openingBalance = asInt(p.openingBalance)
    const manualAdjustment = asInt(p.manualAdjustment)
    const currency = asString(p.currency)
    if (openingBalance === null || manualAdjustment === null || !currency) return null
    return {
      name: asString(p.name) ?? '',
      currency,
      openingBalance,
      manualAdjustment,
    }
  }

  if (entity === 'category') {
    const type = asString(p.type)
    if (type !== 'income' && type !== 'expense') return null
    return {
      name: asString(p.name) ?? '',
      type,
      icon: asString(p.icon) ?? '',
      color: asString(p.color) ?? '',
      slug: null,
    }
  }

  if (entity === 'debtor') {
    return {
      name: asString(p.name) ?? '',
      note: asString(p.note) ?? '',
    }
  }

  if (entity === 'debt_operation') {
    const direction = asString(p.direction)
    const kind = asString(p.kind)
    if (direction !== 'receivable' && direction !== 'payable') return null
    if (kind !== 'debt' && kind !== 'repayment') return null
    const debtorId = asString(p.debtorId)
    const amount = asInt(p.amount)
    const occurredAt = asString(p.occurredAt)
    if (!debtorId || amount === null || !occurredAt) return null
    return {
      debtorId,
      direction,
      kind,
      amount,
      note: asString(p.note) ?? '',
      occurredAt,
    }
  }

  const type = asString(p.type)
  const amount = asInt(p.amount)
  const occurredAt = asString(p.occurredAt)
  if (!type || amount === null || !occurredAt) return null
  if (type === 'transfer') {
    const fromAccountId = asString(p.fromAccountId)
    const toAccountId = asString(p.toAccountId)
    if (!fromAccountId || !toAccountId) return null
    return {
      type,
      amount,
      description: asString(p.description) ?? '',
      occurredAt,
      accountId: null,
      categoryId: null,
      fromAccountId,
      toAccountId,
    }
  }
  if (type !== 'income' && type !== 'expense') return null
  const accountId = asString(p.accountId)
  const categoryId = asString(p.categoryId)
  if (!accountId || !categoryId) return null
  return {
    type,
    amount,
    description: asString(p.description) ?? '',
    occurredAt,
    accountId,
    categoryId,
    fromAccountId: null,
    toAccountId: null,
  }
}
