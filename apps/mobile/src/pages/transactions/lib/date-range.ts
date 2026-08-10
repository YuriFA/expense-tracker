import type { CalendarDay } from '@expense-tracker/api'

/**
 * Date-range presets for the Transactions filter (design section 7: "date
 * range"). The mobile app ships preset ranges rather than a calendar picker -
 * they cover the common cases in one tap and need no extra date-library
 * dependency. A custom-range calendar can slot in later without changing the
 * filter model.
 */
export type DateRangePreset = 'all' | 'today' | 'last30' | 'thisMonth'

/** No active date filter. */
export const DEFAULT_DATE_RANGE: DateRangePreset = 'all'

export interface ResolvedDateRange {
  readonly fromDate?: CalendarDay
  readonly toDate?: CalendarDay
}

const pad2 = (value: number): string => String(value).padStart(2, '0')

/** Local calendar day in `YYYY-MM-DD`, matching the repository's `date()` frame. */
const toCalendarDay = (date: Date): CalendarDay =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

/**
 * Resolve a preset into `{ fromDate, toDate }` consumed by the repository
 * `TransactionQuery`. `all` yields an empty range (no date clause). Uses the
 * device's local date, which is the user's mental model of "today".
 */
export function resolveDateRange(preset: DateRangePreset): ResolvedDateRange {
  const now = new Date()
  const today = toCalendarDay(now)
  switch (preset) {
    case 'today':
      return { fromDate: today, toDate: today }
    case 'last30': {
      const start = new Date(now)
      start.setDate(start.getDate() - 29)
      return { fromDate: toCalendarDay(start), toDate: today }
    }
    case 'thisMonth': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      return { fromDate: toCalendarDay(first), toDate: today }
    }
    case 'all':
    default:
      return {}
  }
}
