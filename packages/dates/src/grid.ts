// Monday-first month-grid math for hand-rolled calendar sheets.

import { addDays, differenceInCalendarDays, eachDayOfInterval, format, getDaysInMonth, startOfMonth, startOfWeek } from 'date-fns'
import { DEFAULT_DATE_LOCALE, resolveDateLocale } from './locale'

/**
 * Calendar grid for a month: rows of week cells with `null` padding before
 * day 1 (Monday-first). The last row is partial - renderers lay cells out
 * with flex, so no trailing padding is needed.
 */
export function monthGrid(year: number, month: number): (number | null)[][] {
  const first = startOfMonth(new Date(year, month, 1))
  const leadingNulls = differenceInCalendarDays(first, startOfWeek(first, { weekStartsOn: 1 }))
  const days = getDaysInMonth(first)

  const cells: (number | null)[] = Array.from({ length: leadingNulls }, () => null)
  for (let day = 1; day <= days; day++) cells.push(day)

  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** Monday-first weekday header abbreviations: ["ПН", …, "ВС"]. */
export function weekdayLabels(locale: string = DEFAULT_DATE_LOCALE): string[] {
  const dateLocale = resolveDateLocale(locale)
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  return eachDayOfInterval({ start: monday, end: addDays(monday, 6) }).map((day) =>
    format(day, 'EEEEEE', { locale: dateLocale }).toUpperCase(),
  )
}
