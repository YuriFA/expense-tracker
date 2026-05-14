import { internationalizedDateAdapter } from './adapters/internationalized-date-adapter'
import type { BrandedCalendarDay, CalendarDay } from './types'

export type {
  BrandedCalendarDay,
  BrandedIsoDateTime,
  CalendarDay,
  IsoDateTime,
} from './types'
export type { BusinessDateAdapter } from './business-date-adapter'
export { fromDateValue, toDateValue } from './date-value-bridge'
export { getDateTimestamp, isIsoDateTime, nowIsoString, parseIsoDateTime } from './datetime'

const dateAdapter = internationalizedDateAdapter

export const currentDay = (): CalendarDay => dateAdapter.currentDay()

export const isCalendarDay = (value: string): value is BrandedCalendarDay => {
  return dateAdapter.isCalendarDay(value)
}

export const parseCalendarDay = (value: string): CalendarDay => dateAdapter.parseCalendarDay(value)

export const parseCalendarDayOrFallback = (
  value: string | null | undefined,
  fallback: CalendarDay,
) => {
  return dateAdapter.parseCalendarDayOrFallback(value, fallback)
}

export const startOfMonth = (value: CalendarDay): CalendarDay => dateAdapter.startOfMonth(value)

export const addCalendarDays = (value: CalendarDay, amount: number): CalendarDay => {
  return dateAdapter.addCalendarDays(value, amount)
}

export const toStartOfDay = (value: CalendarDay) => dateAdapter.toStartOfDay(value)

export const toEndOfDay = (value: CalendarDay) => dateAdapter.toEndOfDay(value)

export const formatCalendarDay = (
  value: CalendarDay,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) => {
  return new Intl.DateTimeFormat(locale, options).format(toStartOfDay(value))
}

export const formatCalendarRange = (
  from: CalendarDay,
  to: CalendarDay,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) => {
  const formatter = new Intl.DateTimeFormat(locale, options)
  const fromDate = toStartOfDay(from)
  const toDate = toStartOfDay(to)

  if (typeof formatter.formatRange === 'function') {
    return formatter.formatRange(fromDate, toDate)
  }

  return `${formatter.format(fromDate)} - ${formatter.format(toDate)}`
}
