// Quick-date chips for the transaction sheet: the last seven days, labeled
// relative to "now". The chips re-derive from the current date instead of
// being hardcoded, and the ISO `occurredAt` they produce keeps the current
// time of day (the sheet picks a day, not a moment).

import { daysAgoLabel } from '@/shared/lib/format/format'

export interface QuickDateOption {
  daysAgo: number
  label: string
}

/** Today, yesterday, then "N дня/дней назад" back to six days ago. */
export function quickDateOptions(): QuickDateOption[] {
  return Array.from({ length: 7 }, (_, daysAgo) => ({
    daysAgo,
    label: daysAgo === 0 ? 'Сегодня' : daysAgo === 1 ? 'Вчера' : daysAgoLabel(daysAgo),
  }))
}

/** The calendar day `daysAgo` back, at `now`'s time of day, as an ISO string. */
export function occurredAtForDaysAgo(daysAgo: number, now: Date = new Date()): string {
  const date = new Date(now)
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}
