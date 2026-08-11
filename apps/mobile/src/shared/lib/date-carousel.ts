/**
 * Date generation + selection logic for the centered `DayCarousel`
 * (shared/ui/DayCarousel). This is the "date generation" + "date comparison"
 * slice of the carousel architecture (the visual `DayItem` is the\n * presentational slice; the carousel engine wiring lives in the component).
 *
 * Pure, `Intl`-free, and RN-free - every helper operates on local-midnight
 * `Date`s from `./date`, so this module is unit-testable without React Native.
 *
 * Infinite-scroll approach: the carousel does NOT build millions of dates. It
 * builds ONE bounded buffer `[effectiveMin, effectiveMax]` sized to the
 * supplied limits (or a generous default span around the reference date when a
 * bound is open). The buffer is a contiguous run of whole days, so a date maps
 * 1:1 to a buffer offset (`offset = dayDiff(start, date)`) and the carousel can
 * `scrollTo(index)` for any date in O(1). `react-native-reanimated-carousel`
 * virtualizes the render window (only ~the visible + a few offscreen items
 * mount), so a buffer of tens of thousands of days costs nothing at runtime -
 * and because the buffer is fixed for the component's lifetime, there is no
 * edge-rebuild and therefore no visible jump. See the PR description for the
 * full rationale and the trade-off vs. true infinite scrolling.
 */

import {
  addDays,
  dayDiff,
  isSameDay,
  startOfDay,
} from './date'

/**
 * How a caller may express which dates are disabled. Either a fixed list
 * (compared by calendar day) or a predicate. `undefined` => nothing disabled.
 */
export type DisabledSpec = Date[] | ((date: Date) => boolean) | undefined

/**
 * A contiguous run of calendar days. Day `i` (0-based) is
 * `addDays(start, i)`; `count` is the number of days in the buffer.
 */
export interface DayBuffer {
  start: Date
  count: number
}

/**
 * Default span (each way from the reference date) when a bound is open. Chosen
 * large enough that back/forward-dating across many years feels unbounded, while
 * keeping the buffer modest: `react-native-reanimated-carousel` maps the whole
 * `data` array on each React render (it virtualizes by nulling non-visible
 * items, not by skipping them), so a tens-of-thousands-of-days buffer would add
 * avoidable per-render work on every snap. 20 years (~7300 days) is far beyond
 * any realistic personal-expense back-date and stays cheap to iterate.
 */
export const DEFAULT_PAST_SPAN_DAYS = 365 * 20
export const DEFAULT_FUTURE_SPAN_DAYS = 365 * 20

export interface BuildDayBufferOptions {
  /** Inclusive lower bound. When omitted, the buffer starts `pastSpanDays`
   * before the reference date. */
  minDate?: Date
  /** Inclusive upper bound. When omitted, the buffer ends `futureSpanDays`
   * after the reference date. */
  maxDate?: Date
  /** The anchor the open-ended spans are measured from (typically the initial
   * selection). Ignored when both `minDate` and `maxDate` are supplied. */
  referenceDate: Date
  /** Span used for the open lower bound. Defaults to {@link DEFAULT_PAST_SPAN_DAYS}. */
  pastSpanDays?: number
  /** Span used for the open upper bound. Defaults to {@link DEFAULT_FUTURE_SPAN_DAYS}. */
  futureSpanDays?: number
}

/**
 * Normalize a {@link DisabledSpec} into a plain predicate that compares by
 * calendar day (so passing a `Date` from a different time-of-day still matches).
 */
export function resolveDisabled(spec: DisabledSpec): (date: Date) => boolean {
  if (!spec) return () => false
  if (typeof spec === 'function') return (date: Date) => spec(startOfDay(date))
  const normalized = spec.map(startOfDay)
  return (date: Date) => normalized.some((d) => isSameDay(d, date))
}

/**
 * Compute the bounded day buffer for a carousel. The buffer always satisfies
 * `effectiveMin <= effectiveMax`; if the supplied bounds are inverted or the
 * spans collapse to nothing, the buffer collapses to the single reference day.
 */
export function buildDayBuffer(options: BuildDayBufferOptions): DayBuffer {
  const {
    minDate,
    maxDate,
    referenceDate,
    pastSpanDays = DEFAULT_PAST_SPAN_DAYS,
    futureSpanDays = DEFAULT_FUTURE_SPAN_DAYS,
  } = options

  const reference = startOfDay(referenceDate)
  const lower = minDate ? startOfDay(minDate) : addDays(reference, -pastSpanDays)
  const upper = maxDate ? startOfDay(maxDate) : addDays(reference, futureSpanDays)

  if (dayDiff(lower, upper) < 0) {
    // Inverted/collapsed bounds: fall back to the single reference day so the
    // carousel still renders one valid item rather than an empty data set.
    return { start: reference, count: 1 }
  }

  return { start: lower, count: dayDiff(lower, upper) + 1 }
}

/** The calendar day at buffer `offset` (0-based). */
export function dateForOffset(buffer: DayBuffer, offset: number): Date {
  return addDays(buffer.start, offset)
}

/**
 * The buffer offset for a `date` (not clamped - may be negative or `>= count`
 * for out-of-range dates; clamp with {@link clampOffset} before indexing).
 */
export function offsetForDate(buffer: DayBuffer, date: Date): number {
  return dayDiff(buffer.start, date)
}

/** Clamp an offset into the valid buffer range `[0, count - 1]`. */
export function clampOffset(buffer: DayBuffer, offset: number): number {
  return Math.max(0, Math.min(buffer.count - 1, Math.round(offset)))
}

/**
 * Find the nearest non-disabled offset to `offset`, searching outward one step
 * at a time (preferring the earlier date on a tie). Returns `offset` itself if
 * it is enabled. Returns `null` only if every day in the buffer is disabled.
 *
 * Used so the carousel can redirect a swipe/fling that would otherwise come to
 * rest on a disabled date to the closest selectable neighbor.
 */
export function nearestEnabledOffset(
  buffer: DayBuffer,
  offset: number,
  isDisabled: (date: Date) => boolean,
): number | null {
  const clamped = clampOffset(buffer, offset)
  if (!isDisabled(dateForOffset(buffer, clamped))) return clamped

  for (let step = 1; step < buffer.count; step++) {
    const before = clamped - step
    const after = clamped + step
    const beforeValid = before >= 0
    const afterValid = after < buffer.count
    // Prefer the earlier date on a tie for a predictable nudge direction.
    if (beforeValid && !isDisabled(dateForOffset(buffer, before))) return before
    if (afterValid && !isDisabled(dateForOffset(buffer, after))) return after
    if (!beforeValid && !afterValid) break
  }
  return null
}
