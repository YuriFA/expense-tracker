import {
  getLocalTimeZone,
  parseDate as parseCalendarDateLib,
  startOfMonth as startOfMonthLib,
  today,
} from '@internationalized/date'
import type { BusinessDateAdapter } from '../business-date-adapter'
import type { BrandedCalendarDay, CalendarDay } from '../types'

const getTimeZone = () => getLocalTimeZone()

const parseCalendarDateValue = (value: string) => parseCalendarDateLib(value)

const toCalendarDateValue = (value: CalendarDay) => parseCalendarDateValue(value)

const asCalendarDay = (value: string): BrandedCalendarDay => value as BrandedCalendarDay

const currentDay = (): CalendarDay => asCalendarDay(today(getTimeZone()).toString())

const isCalendarDay = (value: string): value is BrandedCalendarDay => {
  try {
    return parseCalendarDateValue(value).toString() === value
  } catch {
    return false
  }
}

const parseCalendarDay = (value: string): CalendarDay => {
  return asCalendarDay(parseCalendarDateValue(value).toString())
}

const parseCalendarDayOrFallback = (
  value: string | null | undefined,
  fallback: CalendarDay,
): CalendarDay => {
  if (!value) {
    return fallback
  }

  try {
    return parseCalendarDay(value)
  } catch {
    return fallback
  }
}

const startOfMonth = (value: CalendarDay): CalendarDay => {
  return asCalendarDay(startOfMonthLib(toCalendarDateValue(value)).toString())
}

const addCalendarDays = (value: CalendarDay, amount: number): CalendarDay => {
  return asCalendarDay(toCalendarDateValue(value).add({ days: amount }).toString())
}

const toStartOfDay = (value: CalendarDay) => {
  return toCalendarDateValue(value).toDate(getTimeZone())
}

const toEndOfDay = (value: CalendarDay) => {
  const date = toStartOfDay(value)

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  )
}

export const internationalizedDateAdapter: BusinessDateAdapter = {
  currentDay,
  isCalendarDay,
  parseCalendarDay,
  parseCalendarDayOrFallback,
  startOfMonth,
  addCalendarDays,
  toStartOfDay,
  toEndOfDay,
}
