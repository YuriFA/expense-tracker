import { describe, expect, it } from '@jest/globals'
import type { AccountWithBalance, Category, Transaction } from '@expense-tracker/api'
import { isCurrentOrFutureMonth } from '@/shared/lib/calendar/month'
import {
  categoryBreakdown,
  latestExpense,
  monthlyBalance,
  nextMonth,
  previousMonth,
  totalBalance,
  totalExpenses,
  transactionsInMonth,
} from './selectors'

// Deterministic domain-shaped fixtures.
const CURSOR = { year: 2026, month: 7 } // August 2026
const inAugust = (day: number) => `2026-08-${String(day).padStart(2, '0')}T12:00:00.000Z`

const categories: Category[] = [
  { id: 'c-taxi', name: 'Такси', type: 'expense', icon: 'car', color: '#7c5cff', version: 1 },
  { id: 'c-cafe', name: 'Кафе', type: 'expense', icon: 'cafe', color: '#a78bfa', version: 1 },
  { id: 'c-salary', name: 'Зарплата', type: 'income', icon: 'cash', color: '#16a34a', version: 1 },
]

const accounts: AccountWithBalance[] = [
  {
    id: 'a-cash',
    name: 'Наличные',
    currency: 'RUB',
    openingBalance: 100_000,
    manualAdjustment: 0,
    version: 1,
    balance: 250_000,
  },
  {
    id: 'a-card',
    name: 'Карта',
    currency: 'RUB',
    openingBalance: 200_000,
    manualAdjustment: 50_000,
    version: 1,
    balance: 150_000,
  },
]

const txs: Transaction[] = [
  {
    id: 't1',
    type: 'income',
    amount: 1_000_000,
    description: 'Зарплата',
    occurredAt: inAugust(3),
    version: 1,
    accountId: 'a-card',
    categoryId: 'c-salary',
  },
  {
    id: 't2',
    type: 'expense',
    amount: 400_000,
    description: 'Такси',
    occurredAt: inAugust(10),
    version: 1,
    accountId: 'a-card',
    categoryId: 'c-taxi',
  },
  {
    id: 't3',
    type: 'expense',
    amount: 100_000,
    description: 'Кофе',
    occurredAt: inAugust(20),
    version: 1,
    accountId: 'a-cash',
    categoryId: 'c-cafe',
  },
  {
    id: 't4',
    type: 'transfer',
    amount: 250_000,
    description: 'Перевод',
    occurredAt: inAugust(15),
    version: 1,
    fromAccountId: 'a-card',
    toAccountId: 'a-cash',
  },
  {
    id: 't5',
    type: 'expense',
    amount: 700_000,
    description: 'Июльский расход',
    occurredAt: '2026-07-10T12:00:00.000Z',
    version: 1,
    accountId: 'a-card',
    categoryId: 'c-taxi',
  },
]

describe('selectors · month filtering', () => {
  it('keeps only transactions of the cursor month', () => {
    expect(transactionsInMonth(txs, CURSOR).map((t) => t.id)).toEqual(['t1', 't2', 't3', 't4'])
  })

  it('previousMonth/nextMonth wrap the year boundary', () => {
    expect(previousMonth({ year: 2026, month: 0 })).toEqual({ year: 2025, month: 11 })
    expect(nextMonth({ year: 2026, month: 11 })).toEqual({ year: 2027, month: 0 })
    expect(nextMonth(previousMonth({ year: 2026, month: 7 }))).toEqual({ year: 2026, month: 7 })
  })

  it('flags the current month and the future, not the past', () => {
    const now = new Date(2026, 7, 14)
    expect(isCurrentOrFutureMonth({ year: 2026, month: 7 }, now)).toBe(true)
    expect(isCurrentOrFutureMonth({ year: 2026, month: 8 }, now)).toBe(true)
    expect(isCurrentOrFutureMonth({ year: 2026, month: 6 }, now)).toBe(false)
  })
})

describe('selectors · totals', () => {
  it('totalExpenses sums expenses of the month only', () => {
    expect(totalExpenses(txs, CURSOR)).toBe(500_000)
  })

  it('monthlyBalance is income minus expenses; transfers do not contribute', () => {
    expect(monthlyBalance(txs, CURSOR)).toBe(1_000_000 - 500_000)
  })

  it('totalBalance sums the computed account balances (incl. manualAdjustment)', () => {
    expect(totalBalance(accounts)).toBe(400_000)
  })
})

describe('selectors · category breakdown', () => {
  it('orders expense categories by amount descending and omits the rest', () => {
    const rows = categoryBreakdown(txs, categories, CURSOR)
    expect(rows.map((r) => r.category.id)).toEqual(['c-taxi', 'c-cafe'])
    expect(rows[0].totalMinor).toBe(400_000)
    // income category never appears even though its transaction is in month
    expect(rows.some((r) => r.category.type === 'income')).toBe(false)
  })

  it('latestExpense picks the most recent expense of the month', () => {
    expect(latestExpense(txs, CURSOR)?.id).toBe('t3')
    expect(latestExpense(txs, { year: 2026, month: 9 })).toBeNull()
  })
})
