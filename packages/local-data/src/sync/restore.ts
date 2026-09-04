// Restore-as-new policy (design D2): a single id-based function that
// re-reads a delete-vs-edit conflict, decodes the preserved local state per
// entity through a strict decoder table (no silent value substitution), and
// creates a fresh record via the entity's local repository. The conflict is
// marked resolved only after a successful create.
//
// The decoder table is shaped as a plain Record<SyncEntity, Decoder> so the
// future entity registry (review candidate C2) can absorb it without
// reshaping.

import type {
  CreateAccountPayload,
  CreateCategoryPayload,
  CreateDebtOperationPayload,
  CreateDebtorPayload,
  CreatePlannedPaymentPayload,
  CreateTransactionPayload,
} from '@expense-tracker/api'
import type { LocalDatabase } from '../types'
import { createLocalAccountRepository } from '../repositories/account'
import { createLocalCategoryRepository } from '../repositories/category'
import { createLocalTransactionRepository } from '../repositories/transaction'
import { createLocalDebtorRepository, createLocalDebtOperationRepository } from '../repositories/debt'
import { createLocalPlannedPaymentRepository } from '../repositories/planned-payment'
import type { SyncEntity } from '../schema'
import { getConflictById, markConflictResolved, type LocalSyncConflict } from './conflicts'

// ---------------------------------------------------------------------------
// Shared predicates
// ---------------------------------------------------------------------------

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asNonEmpty(value: unknown): string | null {
  const s = asString(value)
  return s !== null && s.length > 0 ? s : null
}

function asInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null
}

const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/
const CURRENCIES = new Set(['USD', 'EUR', 'RUB'])

// ---------------------------------------------------------------------------
// canRestoreAsNew (moved verbatim from the web module)
// ---------------------------------------------------------------------------

/**
 * True when the preserved local state carries the fields a re-create needs:
 * the state must be a non-null object (it may still fail strict validation
 * per entity, which `restoreConflictAsNew` surfaces as `invalid-state`).
 */
export function canRestoreAsNew(conflict: LocalSyncConflict): boolean {
  return typeof conflict.localState === 'object' && conflict.localState !== null
}

// ---------------------------------------------------------------------------
// Decoder table
// ---------------------------------------------------------------------------

type DecodeOk<T> = { ok: true; payload: T }
type DecodeFail = { ok: false; field?: string }
type DecodeResult<T> = DecodeOk<T> | DecodeFail

function ok<T>(payload: T): DecodeOk<T> {
  return { ok: true, payload }
}
function fail(field?: string): DecodeFail {
  return { ok: false, field }
}

function decodeAccount(
  state: Record<string, unknown>,
): DecodeResult<CreateAccountPayload> {
  const name = asNonEmpty(state.name)
  if (!name) return fail('name')
  const currency = asString(state.currency)
  if (!currency || !CURRENCIES.has(currency)) return fail('currency')
  // openingBalance defaults to 0 when absent (a valid starting value, not a substitution).
  const openingBalance = asInt(state.openingBalance) ?? 0
  return ok({ name, currency: currency as CreateAccountPayload['currency'], openingBalance })
}

function decodeCategory(
  state: Record<string, unknown>,
): DecodeResult<CreateCategoryPayload> {
  const name = asNonEmpty(state.name)
  if (!name) return fail('name')
  const type = asString(state.type)
  if (type !== 'income' && type !== 'expense') return fail('type')
  const icon = asNonEmpty(state.icon)
  if (!icon) return fail('icon')
  const color = asNonEmpty(state.color)
  if (!color) return fail('color')
  return ok({ name, type, icon, color })
}

function decodeTransaction(
  state: Record<string, unknown>,
): DecodeResult<CreateTransactionPayload> {
  const type = asString(state.type)
  if (
    type !== 'income' &&
    type !== 'expense' &&
    type !== 'transfer' &&
    type !== 'adjustment'
  ) {
    return fail('type')
  }

  const amount = asInt(state.amount)
  if (amount === null) return fail('amount')
  // Amount sign rule mirrors the backend: positive for classic types, nonzero
  // signed for adjustment.
  if (type === 'adjustment' ? amount === 0 : amount < 1) return fail('amount')

  const occurredAt = asNonEmpty(state.occurredAt)
  if (!occurredAt) return fail('occurredAt')

  const description = asString(state.description) ?? ''

  if (type === 'transfer') {
    const fromAccountId = asNonEmpty(state.fromAccountId)
    if (!fromAccountId) return fail('fromAccountId')
    const toAccountId = asNonEmpty(state.toAccountId)
    if (!toAccountId) return fail('toAccountId')
    return ok({
      type,
      amount,
      description,
      occurredAt,
      fromAccountId,
      toAccountId,
    } satisfies CreateTransactionPayload)
  }

  if (type === 'adjustment') {
    const accountId = asNonEmpty(state.accountId)
    if (!accountId) return fail('accountId')
    return ok({
      type,
      amount,
      description,
      occurredAt,
      accountId,
    } satisfies CreateTransactionPayload)
  }

  // income / expense: accountId may be null (account-less «Без счета»),
  // but categoryId is always required.
  const accountId = asString(state.accountId) // null is a valid preserved value
  const categoryId = asNonEmpty(state.categoryId)
  if (!categoryId) return fail('categoryId')
  return ok({
    type: type as 'income' | 'expense',
    amount,
    description,
    occurredAt,
    accountId: accountId ?? null,
    categoryId,
  } satisfies CreateTransactionPayload)
}

function decodeDebtor(
  state: Record<string, unknown>,
): DecodeResult<CreateDebtorPayload> {
  const name = asNonEmpty(state.name)
  if (!name) return fail('name')
  const note = asString(state.note) ?? undefined
  return ok({ name, ...(note !== undefined ? { note } : {}) })
}

function decodeDebtOperation(
  state: Record<string, unknown>,
): DecodeResult<CreateDebtOperationPayload> {
  const debtorId = asNonEmpty(state.debtorId)
  if (!debtorId) return fail('debtorId')

  const direction = asString(state.direction)
  if (direction !== 'receivable' && direction !== 'payable') return fail('direction')

  const kind = asString(state.kind)
  if (kind !== 'debt' && kind !== 'repayment') return fail('kind')

  const amount = asInt(state.amount)
  if (amount === null || amount < 1) return fail('amount')

  const occurredAt = asNonEmpty(state.occurredAt)
  if (!occurredAt) return fail('occurredAt')

  const note = asString(state.note) ?? undefined
  return ok({
    debtorId,
    direction,
    kind,
    amount,
    occurredAt,
    ...(note !== undefined ? { note } : {}),
  })
}

function decodePlannedPayment(
  state: Record<string, unknown>,
): DecodeResult<CreatePlannedPaymentPayload> {
  const type = asString(state.type)
  if (type !== 'expense' && type !== 'income') return fail('type')

  const amount = asInt(state.amount)
  if (amount === null || amount < 1) return fail('amount')

  const accountId = asNonEmpty(state.accountId)
  if (!accountId) return fail('accountId')

  const categoryId = asNonEmpty(state.categoryId)
  if (!categoryId) return fail('categoryId')

  const nextDue = asString(state.nextDue)
  if (!nextDue || !CALENDAR_DAY.test(nextDue)) return fail('nextDue')

  const regularity = asString(state.regularity)
  if (
    regularity !== 'daily' &&
    regularity !== 'weekly' &&
    regularity !== 'monthly' &&
    regularity !== 'yearly'
  ) {
    return fail('regularity')
  }

  const confirmMode = asString(state.confirmMode)
  if (confirmMode !== 'manual' && confirmMode !== 'auto') return fail('confirmMode')

  const reminder = asString(state.reminder)
  if (reminder !== 'off' && reminder !== 'day_before' && reminder !== 'on_day') {
    return fail('reminder')
  }

  const name = asString(state.name) ?? undefined
  const note = asString(state.note) ?? undefined
  return ok({
    type,
    amount,
    accountId,
    categoryId,
    nextDue,
    regularity,
    confirmMode,
    reminder,
    ...(name !== undefined ? { name } : {}),
    ...(note !== undefined ? { note } : {}),
  })
}

type Decoder = (state: Record<string, unknown>) => DecodeResult<unknown>

/** Per-entity decoder table. Keys match SyncEntity exactly. */
const DECODERS: Record<SyncEntity, Decoder> = {
  account: decodeAccount,
  category: decodeCategory,
  transaction: decodeTransaction,
  debtor: decodeDebtor,
  debt_operation: decodeDebtOperation,
  planned_payment: decodePlannedPayment,
}

// ---------------------------------------------------------------------------
// restoreConflictAsNew
// ---------------------------------------------------------------------------

export type RestoreResult =
  | { ok: true; entity: SyncEntity; createdId: string }
  | {
      ok: false
      reason: 'conflict-missing' | 'no-local-state' | 'invalid-state'
      entity?: SyncEntity
      field?: string
    }

/**
 * Restores a delete-vs-edit conflict as a new record:
 * 1. Re-reads the conflict by id (race-safe: uses the db, not a stale object).
 * 2. Decodes `localState` through the per-entity decoder table (strict, no
 *    value substitution; refuses on a missing or invalid required field).
 * 3. Creates the new record via the entity's local repository (which owns
 *    validation, author stamping, versioning, and the atomic row+outbox enqueue).
 * 4. Marks the conflict resolved only after a successful create.
 *
 * Returns a result type - never throws across the seam.
 */
export async function restoreConflictAsNew(
  db: LocalDatabase,
  conflictId: string,
): Promise<RestoreResult> {
  const conflict = getConflictById(db, conflictId)
  if (!conflict) {
    return { ok: false, reason: 'conflict-missing' }
  }

  if (typeof conflict.localState !== 'object' || conflict.localState === null) {
    return { ok: false, reason: 'no-local-state', entity: conflict.entity }
  }

  const state = conflict.localState as Record<string, unknown>
  const decoder = DECODERS[conflict.entity]
  const decoded = decoder(state)

  if (!decoded.ok) {
    return {
      ok: false,
      reason: 'invalid-state',
      entity: conflict.entity,
      field: decoded.field,
    }
  }

  try {
    let createdId: string

    switch (conflict.entity) {
      case 'account': {
        const repo = createLocalAccountRepository(db)
        const created = await repo.create(decoded.payload as CreateAccountPayload)
        createdId = created.id
        break
      }
      case 'category': {
        const repo = createLocalCategoryRepository(db)
        const created = await repo.create(decoded.payload as CreateCategoryPayload)
        createdId = created.id
        break
      }
      case 'transaction': {
        const repo = createLocalTransactionRepository(db)
        const created = await repo.create(decoded.payload as CreateTransactionPayload)
        createdId = created.id
        break
      }
      case 'debtor': {
        const repo = createLocalDebtorRepository(db)
        const created = await repo.create(decoded.payload as CreateDebtorPayload)
        createdId = created.id
        break
      }
      case 'debt_operation': {
        const repo = createLocalDebtOperationRepository(db)
        const created = await repo.create(decoded.payload as CreateDebtOperationPayload)
        createdId = created.id
        break
      }
      case 'planned_payment': {
        const repo = createLocalPlannedPaymentRepository(db)
        const created = await repo.create(decoded.payload as CreatePlannedPaymentPayload)
        createdId = created.id
        break
      }
    }

    markConflictResolved(db, conflict.id)
    return { ok: true, entity: conflict.entity, createdId: createdId! }
  } catch {
    // Repository validation failure (e.g. unknown references, invalid payload):
    // leave the conflict unresolved so the user can retry or dismiss.
    return { ok: false, reason: 'invalid-state', entity: conflict.entity }
  }
}
