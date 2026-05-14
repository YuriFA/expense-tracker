import { parseDate as parseCalendarDateLib, type DateValue as DateValueLib } from '@internationalized/date'
import type { CalendarDay } from './types'

export const toDateValue = (value: CalendarDay): DateValueLib => parseCalendarDateLib(value)

export const fromDateValue = (value: DateValueLib): CalendarDay => value.toString()
