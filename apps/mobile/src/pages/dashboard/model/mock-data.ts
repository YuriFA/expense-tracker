// In-memory mock fixtures for the Home screen (UI-first step before API
// integration). Amounts are integer minor units (RUB, divisor 100) and all
// math stays integer per the project money invariant. Dates are generated
// relative to "now" so the current month always has data and the month
// before the previous one is empty (empty-state demo). Throwaway by design:
// replaced by real repositories, not extended.

export type MockCashflowType = 'income' | 'expense'
export type MockTransactionType = MockCashflowType | 'transfer'

export interface MockCategory {
  id: string
  name: string
  type: MockCashflowType
  /** Ionicons glyph name. */
  icon: string
  color: string
}

export interface MockTransaction {
  id: string
  type: MockTransactionType
  amountMinor: number
  description: string
  /**
   * Local-time string ("YYYY-MM-DDTHH:mm"). `new Date(...)` parses it as
   * local time, keeping month membership TZ-safe without UTC shifts.
   */
  occurredAt: string
  /** Cashflow (income/expense) reference. */
  accountId?: string
  categoryId?: string
  /** Transfer references. */
  fromAccountId?: string
  toAccountId?: string
}

export interface MockAccount {
  id: string
  name: string
  openingBalanceMinor: number
}

function toLocalIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/** Day `day` of the current month, clamped to today, at 12:00 local. */
function dayThisMonth(day: number): string {
  const now = new Date()
  const clamped = Math.min(day, now.getDate())
  return toLocalIso(new Date(now.getFullYear(), now.getMonth(), clamped, 12))
}

/** Day `day` of the previous month, clamped to that month's length. */
function dayPrevMonth(day: number): string {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastDay = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate()
  return toLocalIso(new Date(prev.getFullYear(), prev.getMonth(), Math.min(day, lastDay), 12))
}

export const MOCK_ACCOUNTS: MockAccount[] = [
  { id: 'acc-cash', name: 'Наличные', openingBalanceMinor: 500_000 },
  { id: 'acc-card', name: 'Карта', openingBalanceMinor: 3_200_000 },
]

export const MOCK_CATEGORIES: MockCategory[] = [
  { id: 'cat-taxi', name: 'Такси', type: 'expense', icon: 'car', color: '#7C5CFF' },
  { id: 'cat-cafe', name: 'Кафе', type: 'expense', icon: 'cafe', color: '#A78BFA' },
  { id: 'cat-pets', name: 'Животные', type: 'expense', icon: 'paw', color: '#F97316' },
  { id: 'cat-groceries', name: 'Продукты', type: 'expense', icon: 'cart', color: '#22C55E' },
  { id: 'cat-salary', name: 'Зарплата', type: 'income', icon: 'cash', color: '#16A34A' },
]

export const MOCK_TRANSACTIONS: MockTransaction[] = [
  // Current month: salary, expenses across categories, one transfer.
  {
    id: 'tx-salary',
    type: 'income',
    amountMinor: 1_500_000,
    description: 'Зарплата',
    occurredAt: dayThisMonth(3),
    accountId: 'acc-card',
    categoryId: 'cat-salary',
  },
  {
    id: 'tx-taxi',
    type: 'expense',
    amountMinor: 1_931_300,
    description: 'Поездка в центр',
    occurredAt: dayThisMonth(2),
    accountId: 'acc-card',
    categoryId: 'cat-taxi',
  },
  {
    id: 'tx-cafe',
    type: 'expense',
    amountMinor: 300_000,
    description: 'Кофе с собой',
    occurredAt: dayThisMonth(6),
    accountId: 'acc-cash',
    categoryId: 'cat-cafe',
  },
  {
    id: 'tx-pets',
    type: 'expense',
    amountMinor: 450_000,
    description: 'Корм для кота',
    occurredAt: dayThisMonth(31),
    accountId: 'acc-card',
    categoryId: 'cat-pets',
  },
  {
    id: 'tx-groceries',
    type: 'expense',
    amountMinor: 274_000,
    description: 'Супермаркет',
    occurredAt: dayThisMonth(5),
    accountId: 'acc-card',
    categoryId: 'cat-groceries',
  },
  {
    id: 'tx-transfer',
    type: 'transfer',
    amountMinor: 500_000,
    description: 'Снятие наличных',
    occurredAt: dayThisMonth(4),
    fromAccountId: 'acc-card',
    toAccountId: 'acc-cash',
  },
  // Previous month: some history so period navigation shows data.
  {
    id: 'tx-prev-salary',
    type: 'income',
    amountMinor: 1_500_000,
    description: 'Зарплата',
    occurredAt: dayPrevMonth(3),
    accountId: 'acc-card',
    categoryId: 'cat-salary',
  },
  {
    id: 'tx-prev-taxi',
    type: 'expense',
    amountMinor: 950_000,
    description: 'Поездка в аэропорт',
    occurredAt: dayPrevMonth(12),
    accountId: 'acc-card',
    categoryId: 'cat-taxi',
  },
  {
    id: 'tx-prev-cafe',
    type: 'expense',
    amountMinor: 180_000,
    description: 'Обед',
    occurredAt: dayPrevMonth(7),
    accountId: 'acc-cash',
    categoryId: 'cat-cafe',
  },
  // The month before the previous one has no transactions (empty state).
]
