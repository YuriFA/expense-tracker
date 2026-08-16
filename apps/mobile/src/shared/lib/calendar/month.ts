// Month-cursor navigation shared by the dashboard and the transactions tab.
// Pure date logic over domain `Transaction.occurredAt` strings.

import type { Transaction } from '@expense-tracker/api'

/** Month coordinate; `month` is 0-11 like Date. */
export interface MonthCursor {
  year: number
  month: number
}

export function currentMonth(now: Date = new Date()): MonthCursor {
  return { year: now.getFullYear(), month: now.getMonth() }
}

export function previousMonth(cursor: MonthCursor): MonthCursor {
  return cursor.month === 0
    ? { year: cursor.year - 1, month: 11 }
    : { year: cursor.year, month: cursor.month - 1 }
}

export function nextMonth(cursor: MonthCursor): MonthCursor {
  return cursor.month === 11
    ? { year: cursor.year + 1, month: 0 }
    : { year: cursor.year, month: cursor.month + 1 }
}

/** True when `cursor` is at or after the current month (no future months). */
export function isCurrentOrFutureMonth(cursor: MonthCursor, now: Date = new Date()): boolean {
  const c = currentMonth(now)
  return cursor.year > c.year || (cursor.year === c.year && cursor.month >= c.month)
}

function isSameMonth(occurredAt: string, cursor: MonthCursor): boolean {
  const d = new Date(occurredAt)
  return d.getFullYear() === cursor.year && d.getMonth() === cursor.month
}

export function transactionsInMonth(txs: Transaction[], cursor: MonthCursor): Transaction[] {
  return txs.filter((t) => isSameMonth(t.occurredAt, cursor))
}
