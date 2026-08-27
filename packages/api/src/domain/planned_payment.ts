import {
  asInteger,
  asNonEmptyString,
  asPositiveInteger,
  asString,
  isRecord,
} from '../lib/normalize'
import type { CalendarDay } from '../lib/datetime'

/** Plan direction; immutable after create (delete + recreate to change it). */
export type PlannedPaymentType = 'expense' | 'income'
export type PlannedPaymentRegularity = 'daily' | 'weekly' | 'monthly' | 'yearly'
/** `auto` — the server job confirms due occurrences without user action. */
export type PlannedPaymentConfirmMode = 'manual' | 'auto'
export type PlannedPaymentReminder = 'off' | 'day_before' | 'on_day'

export interface PlannedPayment {
  id: string
  type: PlannedPaymentType
  /** Positive minor units (divisor 100). */
  amount: number
  /** Optional name (never unique); empty string = unnamed. */
  name: string
  /** Live account of the same user that confirmed payments post against. */
  accountId: string
  /** Live category of the same user whose type matches the plan's type. */
  categoryId: string
  /** Calendar day of the next occurrence; a past date is legal (starts overdue). */
  nextDue: CalendarDay
  /**
   * Series anchor: the recurrence counts from its day (day-of-month / weekday /
   * month-and-day), so short-month clamping recovers to it (Jan 31 → Feb 28 →
   * Mar 31). Editing `nextDue` resets the anchor to the new date.
   */
  anchorDate: CalendarDay
  regularity: PlannedPaymentRegularity
  confirmMode: PlannedPaymentConfirmMode
  reminder: PlannedPaymentReminder
  /** Optional free-form note; always a string on the wire (never null). */
  note: string
  /** Optimistic-concurrency revision (bumped on every server update). */
  version: number
  /**
   * Who created/last changed the record (household authorship, household-ux):
   * the local-data row's `userId`. Absent on the REST contract surface (only
   * sync delivers it) and on records authored before authorship existed.
   */
  authorId?: string | null
}

const CALENDAR_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// `YYYY-MM-DD` strings only: Date.parse rejects out-of-range ISO components
// (e.g. 2024-02-31) in every target engine, so the round-trip check is exact.
const asCalendarDay = (value: unknown): CalendarDay | null => {
  if (typeof value !== 'string' || !CALENDAR_DAY_PATTERN.test(value)) {
    return null
  }
  return Number.isNaN(Date.parse(value)) ? null : value
}

const isPlannedPaymentType = (value: unknown): value is PlannedPaymentType =>
  value === 'expense' || value === 'income'

const isPlannedPaymentRegularity = (
  value: unknown,
): value is PlannedPaymentRegularity =>
  value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'yearly'

const isPlannedPaymentConfirmMode = (
  value: unknown,
): value is PlannedPaymentConfirmMode => value === 'manual' || value === 'auto'

const isPlannedPaymentReminder = (
  value: unknown,
): value is PlannedPaymentReminder =>
  value === 'off' || value === 'day_before' || value === 'on_day'

export const normalizePlannedPayment = (value: unknown): PlannedPayment | null => {
  if (!isRecord(value)) {
    return null
  }

  const id = asNonEmptyString(value.id)
  const type = isPlannedPaymentType(value.type) ? value.type : null
  const amount = asPositiveInteger(value.amount)
  const name = asString(value.name) ?? ''
  const accountId = asNonEmptyString(value.accountId)
  const categoryId = asNonEmptyString(value.categoryId)
  const nextDue = asCalendarDay(value.nextDue)
  const anchorDate = asCalendarDay(value.anchorDate)
  const regularity = isPlannedPaymentRegularity(value.regularity) ? value.regularity : null
  const confirmMode = isPlannedPaymentConfirmMode(value.confirmMode)
    ? value.confirmMode
    : null
  const reminder = isPlannedPaymentReminder(value.reminder) ? value.reminder : null
  const note = asString(value.note) ?? ''
  const version = asInteger(value.version)
  const authorId = value.authorId == null ? undefined : asString(value.authorId)

  if (
    !id ||
    !type ||
    !amount ||
    !accountId ||
    !categoryId ||
    !nextDue ||
    !anchorDate ||
    !regularity ||
    !confirmMode ||
    !reminder ||
    version === null
  ) {
    return null
  }

  return {
    id,
    type,
    amount,
    name,
    accountId,
    categoryId,
    nextDue,
    anchorDate,
    regularity,
    confirmMode,
    reminder,
    note,
    version,
    ...(authorId !== undefined ? { authorId } : {}),
  }
}
