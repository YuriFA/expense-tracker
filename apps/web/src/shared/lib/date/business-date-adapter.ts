import type { BrandedCalendarDay, CalendarDay } from './types'

export interface BusinessDateAdapter {
  currentDay(): CalendarDay
  isCalendarDay(value: string): value is BrandedCalendarDay
  parseCalendarDay(value: string): CalendarDay
  parseCalendarDayOrFallback(value: string | null | undefined, fallback: CalendarDay): CalendarDay
  startOfMonth(value: CalendarDay): CalendarDay
  addCalendarDays(value: CalendarDay, amount: number): CalendarDay
  toStartOfDay(value: CalendarDay): Date
  toEndOfDay(value: CalendarDay): Date
}
