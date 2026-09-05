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
