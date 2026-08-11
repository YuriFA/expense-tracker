/**
 * Calendar-day helpers for the add-transaction date carousel.
 *
 * The carousel works in *local calendar days* (the user's mental model of
 * "today" / "yesterday"), not UTC instants, so selection compares Y/M/D. These
 * helpers normalize a `Date` to local midnight and compare two dates by their
 * calendar day. `Intl`-free and deterministic (Hermes-safe).
 */

/** Normalize a date to local midnight (00:00:00.000) on its calendar day. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Local midnight for "today". */
export function today(): Date {
  return startOfDay(new Date())
}

/** Whether two dates fall on the same local calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Whole-day difference `b - a` (negative when `b` is before `a`). */
export function dayDiff(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / msPerDay)
}

/**
 * Build a rolling window of N consecutive calendar days ending at `end`
 * (inclusive). Each entry is normalized to local midnight. Used by the date
 * carousel to render the recent two weeks with today last.
 */
export function dayWindow(end: Date, count: number): Date[] {
  const days: Date[] = []
  const last = startOfDay(end)
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(last)
    d.setDate(d.getDate() - i)
    days.push(startOfDay(d))
  }
  return days
}
