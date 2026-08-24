import {
  asDateTimeString,
  asInteger,
  asNonEmptyString,
  asPositiveInteger,
  asString,
  isRecord,
} from '../lib/normalize'

/** Money owed to the user («мне должны») vs money the user owes («я должен»). */
export type DebtDirection = 'receivable' | 'payable'
/** `debt` grows the owed amount; `repayment` («списание») shrinks it. */
export type DebtOperationKind = 'debt' | 'repayment'

export interface DebtOperation {
  id: string
  debtorId: string
  direction: DebtDirection
  kind: DebtOperationKind
  /** Positive minor units (divisor 100). */
  amount: number
  /** Optional free-form note; always a string on the wire (never null). */
  note: string
  occurredAt: string
  /** Optimistic-concurrency revision (bumped on every server update). */
  version: number
}

const isDebtDirection = (value: unknown): value is DebtDirection =>
  value === 'receivable' || value === 'payable'

const isDebtOperationKind = (value: unknown): value is DebtOperationKind =>
  value === 'debt' || value === 'repayment'

export const normalizeDebtOperation = (value: unknown): DebtOperation | null => {
  if (!isRecord(value)) {
    return null
  }

  const id = asNonEmptyString(value.id)
  const debtorId = asNonEmptyString(value.debtorId)
  const direction = isDebtDirection(value.direction) ? value.direction : null
  const kind = isDebtOperationKind(value.kind) ? value.kind : null
  const amount = asPositiveInteger(value.amount)
  const note = asString(value.note) ?? ''
  const occurredAt = asDateTimeString(value.occurredAt)
  const version = asInteger(value.version)

  if (!id || !debtorId || !direction || !kind || !amount || !occurredAt || version === null) {
    return null
  }

  return {
    id,
    debtorId,
    direction,
    kind,
    amount,
    note,
    occurredAt,
    version,
  }
}
