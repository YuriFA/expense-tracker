// Week/month/year period navigation for analytics screens: an anchor-based
// cursor (local midnight on the period's first day) with shift/compare/range
// helpers. Weeks start on Monday (the calendar convention in grid.ts). Like
// month.ts, exact membership is local-time; repository pre-filters receive an
// inclusive UTC-day superset of the local period.

import {
  addMonths,
  addWeeks,
  addYears,
  format,
  isSameMonth,
  isSameWeek,
  isSameYear,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { DEFAULT_DATE_LOCALE, resolveDateLocale } from './locale'

/** Analytics period granularities; weeks are Monday-start. */
export type AnalyticsPeriodKind = 'week' | 'month' | 'year'

/** Anchor cursor: `start` is local midnight on the period's first day. */
export interface PeriodCursor {
  kind: AnalyticsPeriodKind
  start: Date
}

function snapToPeriod(kind: AnalyticsPeriodKind, date: Date): Date {
  if (kind === 'week') return startOfWeek(date, { weekStartsOn: 1 })
  if (kind === 'month') return startOfMonth(date)
  return startOfYear(date)
}

/** The period containing `now`, in the device's local calendar. */
export function currentPeriod(kind: AnalyticsPeriodKind, now: Date = new Date()): PeriodCursor {
  return { kind, start: snapToPeriod(kind, now) }
}

/**
 * Step ±N periods. Month/year arithmetic on a period start (always the 1st /
 * Jan 1) keeps local midnight; weeks re-snap after the ms-based week shift so
 * a DST transition cannot drift the anchor off Monday midnight.
 */
export function shiftPeriod(cursor: PeriodCursor, steps: number): PeriodCursor {
  if (cursor.kind === 'week') {
    return { kind: cursor.kind, start: startOfWeek(addWeeks(cursor.start, steps), { weekStartsOn: 1 }) }
  }
  if (cursor.kind === 'month') {
    return { kind: cursor.kind, start: addMonths(cursor.start, steps) }
  }
  return { kind: cursor.kind, start: addYears(cursor.start, steps) }
}

/** True when both cursors are the same kind and start on the same local day. */
export function isSamePeriod(a: PeriodCursor, b: PeriodCursor): boolean {
  return (
    a.kind === b.kind &&
    a.start.getFullYear() === b.start.getFullYear() &&
    a.start.getMonth() === b.start.getMonth() &&
    a.start.getDate() === b.start.getDate()
  )
}

function nextPeriodStart(cursor: PeriodCursor): Date {
  return shiftPeriod(cursor, 1).start
}

/**
 * Inclusive UTC calendar days (`YYYY-MM-DD`) covering the cursor's local
 * period — a superset, never exact outside UTC, exactly like
 * monthToUtcDayRange: day filters cannot express local-period boundaries.
 * Usable as repository `fromDate`/`toDate` pre-filters; exact local-period
 * membership still comes from `transactionsInPeriod` on the fetched superset.
 */
export function periodToUtcDayRange(cursor: PeriodCursor): { fromDate: string; toDate: string } {
  const end = new Date(nextPeriodStart(cursor).getTime() - 1)
  return {
    fromDate: cursor.start.toISOString().slice(0, 10),
    toDate: end.toISOString().slice(0, 10),
  }
}

/** Items whose ISO `occurredAt` falls in the cursor's period (local time). */
export function transactionsInPeriod<T extends { occurredAt: string }>(
  txs: readonly T[],
  cursor: PeriodCursor,
): T[] {
  const start = cursor.start
  return txs.filter((tx) => {
    const date = new Date(tx.occurredAt)
    if (cursor.kind === 'week') return isSameWeek(date, start, { weekStartsOn: 1 })
    if (cursor.kind === 'month') return isSameMonth(date, start)
    return isSameYear(date, start)
  })
}

/**
 * Human-readable inclusive range: "3 августа – 9 августа", "1 августа – 31
 * августа", "1 января – 31 декабря 2026". Week/month labels append the year
 * only when the range spans two calendar years.
 */
export function periodRangeLabel(
  cursor: PeriodCursor,
  locale: string = DEFAULT_DATE_LOCALE,
): string {
  const opts = { locale: resolveDateLocale(locale) }
  const end = new Date(nextPeriodStart(cursor).getTime() - 1)
  if (cursor.kind === 'year') {
    return `${format(cursor.start, 'd MMMM', opts)} – ${format(end, 'd MMMM yyyy', opts)}`
  }
  const day = cursor.start.getFullYear() !== end.getFullYear() ? 'd MMMM yyyy' : 'd MMMM'
  return `${format(cursor.start, day, opts)} – ${format(end, day, opts)}`
}
