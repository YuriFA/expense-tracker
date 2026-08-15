// Pure derived-data helpers for the Home screen. Integer math only; every
// function takes the mock fixtures plus a month cursor and returns plain
// values, so they are trivially unit-testable and later swappable for real
// API responses.

import { ExpenseRowView } from '../ui/expenses-sheet'
import { formatAmount, relativeDayLabel } from './format'
import type { MockCategory, MockTransaction, MockAccount } from './mock-data'

/** Month coordinate; `month` is 0-11 like Date. */
export interface MonthCursor {
  year: number
  month: number
}

export function currentMonth(now: Date = new Date()): MonthCursor {
  return { year: now.getFullYear(), month: now.getMonth() }
}

function isSameMonth(occurredAt: string, cursor: MonthCursor): boolean {
  const d = new Date(occurredAt)
  return d.getFullYear() === cursor.year && d.getMonth() === cursor.month
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

export function transactionsInMonth(
  txs: MockTransaction[],
  cursor: MonthCursor,
): MockTransaction[] {
  return txs.filter((t) => isSameMonth(t.occurredAt, cursor))
}

export function expensesInMonth(txs: MockTransaction[], cursor: MonthCursor): MockTransaction[] {
  return transactionsInMonth(txs, cursor).filter((t) => t.type === 'expense')
}

export function toExpenseRow(tx: MockTransaction, categories: MockCategory[]): ExpenseRowView {
  const category = categories.find((c) => c.id === tx.categoryId)
  return {
    id: tx.id,
    description: tx.description,
    categoryName: category?.name ?? 'Без категории',
    categoryIcon: category?.icon ?? 'pricetag-outline',
    categoryColor: category?.color ?? '#A3A3A3',
    dayLabel: relativeDayLabel(tx.occurredAt),
    amountText: formatAmount(tx.amountMinor),
  }
}

export function totalExpenses(txs: MockTransaction[], cursor: MonthCursor): number {
  return expensesInMonth(txs, cursor).reduce((sum, t) => sum + t.amountMinor, 0)
}

/**
 * Monthly balance = income − expenses for the period. Transfers never
 * contribute: they move money between the user's own accounts and are
 * neither income nor expense.
 */
export function monthlyBalance(txs: MockTransaction[], cursor: MonthCursor): number {
  return transactionsInMonth(txs, cursor).reduce((sum, t) => {
    if (t.type === 'income') return sum + t.amountMinor
    if (t.type === 'expense') return sum - t.amountMinor
    return sum
  }, 0)
}

/**
 * All-time account balance = opening balance + signed transaction impact
 * (income +, expense −, transfer −from/+to). Integer math only.
 */
export function accountBalances(
  accounts: MockAccount[],
  txs: MockTransaction[],
): Map<string, number> {
  const balances = new Map<string, number>(accounts.map((a) => [a.id, a.openingBalanceMinor]))
  for (const t of txs) {
    if (t.type === 'income' || t.type === 'expense') {
      if (t.accountId) {
        const sign = t.type === 'income' ? 1 : -1
        balances.set(t.accountId, (balances.get(t.accountId) ?? 0) + sign * t.amountMinor)
      }
    } else {
      if (t.fromAccountId) {
        balances.set(t.fromAccountId, (balances.get(t.fromAccountId) ?? 0) - t.amountMinor)
      }
      if (t.toAccountId) {
        balances.set(t.toAccountId, (balances.get(t.toAccountId) ?? 0) + t.amountMinor)
      }
    }
  }
  return balances
}

/** Total balance across accounts (point-in-time, period-independent). */
export function totalBalance(accounts: MockAccount[], txs: MockTransaction[]): number {
  let sum = 0
  for (const balance of accountBalances(accounts, txs).values()) sum += balance
  return sum
}

export interface CategorySpend {
  category: MockCategory
  totalMinor: number
}

/**
 * Expense totals per category for the period, descending by amount.
 * Categories without spending in the period are omitted.
 */
export function categoryBreakdown(
  txs: MockTransaction[],
  categories: MockCategory[],
  cursor: MonthCursor,
): CategorySpend[] {
  const totals = new Map<string, number>()
  for (const t of expensesInMonth(txs, cursor)) {
    if (!t.categoryId) continue
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amountMinor)
  }
  return categories
    .filter((c) => totals.has(c.id))
    .map((c) => ({ category: c, totalMinor: totals.get(c.id) as number }))
    .sort((a, b) => b.totalMinor - a.totalMinor)
}

/** Most recent expense of the period (ties broken by id for stability). */
export function latestExpense(txs: MockTransaction[], cursor: MonthCursor): MockTransaction | null {
  const expenses = expensesInMonth(txs, cursor)
  if (expenses.length === 0) return null
  return expenses.reduce((latest, t) =>
    t.occurredAt > latest.occurredAt || (t.occurredAt === latest.occurredAt && t.id > latest.id)
      ? t
      : latest,
  )
}
