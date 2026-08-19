import { format, subDays } from 'date-fns'

/** Local-time `yyyy-MM-dd` day key for grouping and test ids: "2026-08-17". */
export function calendarDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Canonical UTC ISO-8601 timestamp - the storage convention for all entities. */
export function nowIso(): string {
  return new Date().toISOString()
}

/**
 * UTC ISO-8601 timestamp for `days` ago, keeping `now`'s time of day - the
 * convention for day-picking UIs that select a day, not a moment.
 */
export function isoDaysAgo(days: number, now: Date = new Date()): string {
  return subDays(now, days).toISOString()
}
