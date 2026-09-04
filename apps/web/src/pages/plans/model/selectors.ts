// Pure view-model helpers for the plans screen, ported from the mobile page
// selectors. Overdue is a UTC-day comparison against the plan's next-due
// calendar day (planned-payments capability); advancement math itself lives
// in the package (advanceNextDue) - the web adds no recurrence logic.

import type { Category } from '@expense-tracker/api'
import type { PlannedPayment } from '@/entities/planned-payment'
import { fullDayLabel } from '@expense-tracker/dates'

/** Today as a UTC calendar-day key (`YYYY-MM-DD`). */
export function utcTodayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** Next-due ascending (overdue plans first by construction); ties by id. */
export function plansSortedByNextDue(plans: readonly PlannedPayment[]): PlannedPayment[] {
  return [...plans].sort((a, b) => a.nextDue.localeCompare(b.nextDue) || a.id.localeCompare(b.id))
}

export function isPlanOverdue(plan: PlannedPayment, today: string): boolean {
  return plan.nextDue <= today
}

/** The row title: the plan's name, or the category's name when unnamed. */
export function planRowTitle(plan: PlannedPayment, categories: readonly Category[]): string {
  if (plan.name) return plan.name
  return categories.find((category) => category.id === plan.categoryId)?.name ?? ''
}

/** Locale label of a next-due calendar day («17 августа»). */
export function nextDueLabel(day: string, locale: string): string {
  return fullDayLabel(new Date(`${day}T00:00:00`), locale)
}
