// Pure derived-data helpers for the Home screen over the DOMAIN types from
// @expense-tracker/api. Integer money math only (minor units); balances come
// pre-computed from the account repository (opening + manualAdjustment +
// signed transaction impacts), so selectors only aggregate them.

import type { AccountWithBalance, Category, Transaction } from '@expense-tracker/api'
import {
  calendarDayKey,
  fullDayLabel,
  relativeDayLabel,
  transactionsInMonth,
  type MonthCursor,
} from '@expense-tracker/dates'
import type { IconName } from '@/shared/ui/icon'
import { formatAmount } from '@/shared/lib/format/format'
import { ExpenseRowView } from '../ui/expenses-sheet'

export {
  currentMonth,
  nextMonth,
  previousMonth,
  transactionsInMonth,
  type MonthCursor,
} from '@expense-tracker/dates'

export function expensesInMonth(txs: Transaction[], cursor: MonthCursor): Transaction[] {
  return transactionsInMonth(txs, cursor).filter((t) => t.type === 'expense')
}

function toExpenseRow(tx: Transaction, categories: Category[]): ExpenseRowView {
  const category = categories.find((c) => c.id === tx.categoryId)
  return {
    id: tx.id,
    description: tx.description ?? '',
    categoryName: category?.name ?? 'Без категории',
    categoryIcon: (category?.icon ?? 'pricetag-outline') as IconName,
    // No fallback here: the view layer owns the presentation default (a
    // theme-aware token class), keeping this pure function free of theming.
    categoryColor: category?.color,
    dayLabel: relativeDayLabel(tx.occurredAt),
    amountText: formatAmount(tx.amount),
  }
}

export interface ExpenseDayGroup {
  /** Local calendar date "2026-08-17"; stable key for testIDs. */
  key: string
  /** "17 августа" */
  title: string
  /** "3 123 ₽" — the day's expense total. */
  totalText: string
  rows: ExpenseRowView[]
}

/** Newest first (ties broken by id, matching latestExpense). */
function byOccurredAtDesc(a: Transaction, b: Transaction): number {
  if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? 1 : -1
  if (a.id !== b.id) return a.id < b.id ? 1 : -1
  return 0
}

/**
 * The month's expenses grouped by local calendar day, newest day first, each
 * day's rows newest first. Feeds the grouped expenses sheet.
 */
export function expenseDayGroups(
  txs: Transaction[],
  categories: Category[],
  cursor: MonthCursor,
): ExpenseDayGroup[] {
  const expenses = expensesInMonth(txs, cursor).slice().sort(byOccurredAtDesc)

  const buckets: Array<Omit<ExpenseDayGroup, 'totalText'> & { totalMinor: number }> = []
  for (const tx of expenses) {
    const key = calendarDayKey(new Date(tx.occurredAt))

    const current = buckets[buckets.length - 1]
    if (current?.key === key) {
      current.rows.push(toExpenseRow(tx, categories))
      current.totalMinor += tx.amount
    } else {
      buckets.push({
        key,
        title: fullDayLabel(tx.occurredAt),
        totalMinor: tx.amount,
        rows: [toExpenseRow(tx, categories)],
      })
    }
  }

  return buckets.map(({ key, title, totalMinor, rows }) => ({
    key,
    title,
    totalText: formatAmount(totalMinor),
    rows,
  }))
}

export function totalExpenses(txs: Transaction[], cursor: MonthCursor): number {
  return expensesInMonth(txs, cursor).reduce((sum, t) => sum + t.amount, 0)
}

/**
 * Monthly balance = income − expenses for the period. Transfers never
 * contribute: they move money between the user's own accounts and are
 * neither income nor expense.
 */
export function monthlyBalance(txs: Transaction[], cursor: MonthCursor): number {
  return transactionsInMonth(txs, cursor).reduce((sum, t) => {
    if (t.type === 'income') return sum + t.amount
    if (t.type === 'expense') return sum - t.amount
    return sum
  }, 0)
}

/** Total balance across accounts (point-in-time, period-independent). */
export function totalBalance(accounts: AccountWithBalance[]): number {
  return accounts.reduce((sum, account) => sum + account.balance, 0)
}

export interface CategorySpend {
  category: Category
  totalMinor: number
}

/**
 * Expense totals per category for the period, descending by amount.
 * Categories without spending in the period are omitted.
 */
export function categoryBreakdown(
  txs: Transaction[],
  categories: Category[],
  cursor: MonthCursor,
): CategorySpend[] {
  const totals = new Map<string, number>()
  for (const t of expensesInMonth(txs, cursor)) {
    if (t.type !== 'expense' || !t.categoryId) continue
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount)
  }
  return categories
    .filter((c) => totals.has(c.id))
    .map((c) => ({ category: c, totalMinor: totals.get(c.id) as number }))
    .sort((a, b) => b.totalMinor - a.totalMinor)
}

/** Most recent expense of the period (ties broken by id for stability). */
export function latestExpense(txs: Transaction[], cursor: MonthCursor): Transaction | null {
  const expenses = expensesInMonth(txs, cursor)
  if (expenses.length === 0) return null
  return expenses.reduce((latest, t) =>
    t.occurredAt > latest.occurredAt || (t.occurredAt === latest.occurredAt && t.id > latest.id)
      ? t
      : latest,
  )
}
