/**
 * Calendar-day helpers for the add-transaction date carousel.
 *
 * The carousel works in *local calendar days* (the user's mental model of
 * "today" / "yesterday"), not UTC instants, so selection compares Y/M/D. These
 * helpers normalize a `Date` to local midnight and compare two dates by their
 * calendar day. `Intl`-free and deterministic (Hermes-safe).
 *
 * Date ARITHMETIC delegates to `date-fns` (which is itself `Intl`-free - it
 * takes a `Locale` object and never touches `Intl.DateTimeFormat`), while the
 * display layer stays in `format.ts` with the static EN/RU tables. Every result
 * is re-normalized to local midnight so callers can compare with `===`-free
 * `isSameDay`/`dayDiff` without worrying about stray time components.
 */

import { addDays as fnsAddDays, isLeapYear as fnsIsLeapYear } from 'date-fns'

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
 * (inclusive). Each entry is normalized to local midnight.
 *
 * @deprecated The new centered `DayCarousel` (shared/ui/DayCarousel) renders an
 * effectively-unbounded date ribbon via `buildDayBuffer` in `date-carousel.ts`
 * and no longer builds a fixed window. Kept for any legacy callers and for the
 * date-utils unit tests.
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

/**
 * Add (or subtract, with a negative `amount`) whole calendar days, returning a
 * midnight-normalized local date. Month/year boundaries and leap days are
 * handled by `date-fns` (e.g. `addDays(Jan 31, 1)` -> Feb 1,
 * `addDays(Dec 31, 1)` -> Jan 1 next year, `addDays(Feb 28 2024, 1)` -> Feb 29).
 */
export function addDays(date: Date, amount: number): Date {
  return startOfDay(fnsAddDays(date, amount))
}

/** Subtract whole calendar days (convenience alias for `addDays(_, -n)`). */
export function subDays(date: Date, amount: number): Date {
  return addDays(date, -amount)
}

/** Whether the calendar year of `date` is a leap year (date-fns). */
export function isLeapYear(date: Date): boolean {
  return fnsIsLeapYear(date)
}

/** Strict calendar-day ordering: `a` is on an earlier day than `b`. */
export function isBeforeDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime()
}

/** Strict calendar-day ordering: `a` is on a later day than `b`. */
export function isAfterDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() > startOfDay(b).getTime()
}

/**
 * Clamp `date` into the inclusive `[minDate, maxDate]` range (either bound
 * optional). Returns a new midnight-normalized date; the original is unchanged.
 * A date already in range is returned normalized (not the same reference).
 */
export function clampDate(date: Date, minDate?: Date, maxDate?: Date): Date {
  const normalized = startOfDay(date)
  const min = minDate ? startOfDay(minDate) : null
  const max = maxDate ? startOfDay(maxDate) : null
  if (min && isBeforeDay(normalized, min)) return min
  if (max && isAfterDay(normalized, max)) return max
  return normalized
}

/** Whether `date` falls within the inclusive `[minDate, maxDate]` range. */
export function isWithinRange(date: Date, minDate?: Date, maxDate?: Date): boolean {
  if (minDate && isBeforeDay(date, minDate)) return false
  if (maxDate && isAfterDay(date, maxDate)) return false
  return true
}
