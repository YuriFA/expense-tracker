// Month-cursor navigation: a `{year, month}` coordinate for month-scoped
// screens, with the wraparound arithmetic delegated to date-fns.

import { addMonths, format, isSameMonth } from 'date-fns'
import { DEFAULT_DATE_LOCALE, resolveDateLocale } from './locale'

/** Month coordinate; `month` is 0-11 like Date. */
export interface MonthCursor {
  year: number
  month: number
}

const cursorDate = (cursor: MonthCursor): Date => new Date(cursor.year, cursor.month, 1)

const dateToCursor = (date: Date): MonthCursor => ({ year: date.getFullYear(), month: date.getMonth() })

export function currentMonth(now: Date = new Date()): MonthCursor {
  return { year: now.getFullYear(), month: now.getMonth() }
}

export function previousMonth(cursor: MonthCursor): MonthCursor {
  return dateToCursor(addMonths(cursorDate(cursor), -1))
}

export function nextMonth(cursor: MonthCursor): MonthCursor {
  return dateToCursor(addMonths(cursorDate(cursor), 1))
}

/** True when `cursor` is at or after the current month (no future months). */
export function isCurrentOrFutureMonth(cursor: MonthCursor, now: Date = new Date()): boolean {
  const current = currentMonth(now)
  return cursor.year > current.year || (cursor.year === current.year && cursor.month >= current.month)
}

/** Nominative month name for calendar headers: "Август". */
export function monthLabel(year: number, month: number, locale: string = DEFAULT_DATE_LOCALE): string {
  const standalone = format(new Date(year, month, 1), 'LLLL', { locale: resolveDateLocale(locale) })
  // The ru standalone form is lowercase ("август"); headers are capitalized.
  return standalone.charAt(0).toUpperCase() + standalone.slice(1)
}

/** Items whose ISO `occurredAt` falls in `cursor`'s month (local time). */
export function transactionsInMonth<T extends { occurredAt: string }>(txs: readonly T[], cursor: MonthCursor): T[] {
  const month = cursorDate(cursor)
  return txs.filter((tx) => isSameMonth(new Date(tx.occurredAt), month))
}

/**
 * Inclusive UTC calendar days (`YYYY-MM-DD`) covering `cursor`'s local
 * calendar month — a superset, never exact outside UTC: day filters cannot
 * express local-month boundaries. Usable as repository `fromDate`/`toDate`
 * pre-filters; exact local-month membership still comes from
 * `transactionsInMonth` applied to the fetched superset.
 */
export function monthToUtcDayRange(cursor: MonthCursor): { fromDate: string; toDate: string } {
  const start = cursorDate(cursor)
  // Last instant of the local month; month+1 and the ms step are safe across
  // year wraparound (December → January).
  const end = new Date(cursor.year, cursor.month + 1, 1).getTime() - 1
  return {
    fromDate: start.toISOString().slice(0, 10),
    toDate: new Date(end).toISOString().slice(0, 10),
  }
}
