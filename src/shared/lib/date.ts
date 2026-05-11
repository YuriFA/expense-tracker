import {
  getLocalTimeZone,
  today,
  parseDate as parseCalendarDateLib,
  type DateValue as DateValueLib,
  startOfMonth as startOfMonthLib,
} from '@internationalized/date'

export type DateValue = DateValueLib

const timeZone = getLocalTimeZone()

export const currentDay = () => today(timeZone)

export const parseCalendarDate = (value: string) => parseCalendarDateLib(value)

export const toStartOfDay = (value: string | DateValue) => {
  const dateValue = typeof value === 'string' ? parseCalendarDate(value) : value

  return dateValue.toDate(timeZone)
}

export const toEndOfDay = (value: string | DateValue) => {
  const date = toStartOfDay(value)

  date.setHours(23, 59, 59, 999)

  return date
}

export const startOfMonth = startOfMonthLib
