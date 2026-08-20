// Category cashflow sheet behavior over the CategorySection harness (it
// owns the sheet's open flow): the opened month renders its period, total,
// and day-grouped rows for the category only; the in-sheet month navigator
// switches periods; the sort toggle flips the day order; an empty month
// shows the empty state; the footer and header actions present the
// transaction-creation and category-edit sheets. The expense kind keeps
// the dashboard's ids and wording; the income kind mirrors them.

import { describe, expect, it } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import type { Category, Transaction } from '@expense-tracker/api'
import { ThemeProvider } from '@/shared/config/theme'
import { createQueryClient } from '@/shared/lib/query/query-client'
import { AccountRepositoryProvider } from '@/entities/account/api/repository'
import { createMockAccountRepository } from '@/entities/account/model/mock-repository'
import { CategoryRepositoryProvider } from '@/entities/category/api/repository'
import { createMockCategoryRepository } from '@/entities/category/model/mock-repository'
import { TransactionRepositoryProvider } from '@/entities/transaction/api/repository'
import { createMockTransactionRepository } from '@/entities/transaction/model/mock-repository'
import { BottomSheetProvider } from '@/shared/ui/bottom-sheet/bottom-sheet-provider'
import { CategorySection } from './category-section'
import { formatAmount } from '@/shared/lib/format/format'
import { monthRangeLabelShort } from '@expense-tracker/dates'
import { currentMonth, previousMonth, totalCashflow } from '../model/selectors'

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

// --- Date-relative fixtures (current month has two taxi days plus a cafe
// expense, the previous month one taxi day, older months are empty) ---------

function toIso(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).toISOString()
}

/** Day `day` of the current month, clamped to today, at 12:00 local. */
function dayThisMonth(day: number): string {
  const now = new Date()
  return toIso(new Date(now.getFullYear(), now.getMonth(), Math.min(day, now.getDate()), 12))
}

function dayPrevMonth(day: number): string {
  const prev = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
  const lastDay = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate()
  return toIso(new Date(prev.getFullYear(), prev.getMonth(), Math.min(day, lastDay), 12))
}

const CATEGORIES: Category[] = [
  { id: 'cat-taxi', name: 'Такси', type: 'expense', icon: 'car', color: '#7c5cff', version: 1 },
  { id: 'cat-cafe', name: 'Кафе', type: 'expense', icon: 'cafe', color: '#a78bfa', version: 1 },
]

const TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-taxi-1',
    type: 'expense',
    amount: 1_931_300,
    description: 'Поездка в центр',
    occurredAt: dayThisMonth(2),
    version: 1,
    accountId: 'acc-card',
    categoryId: 'cat-taxi',
  },
  {
    id: 'tx-taxi-2',
    type: 'expense',
    amount: 250_000,
    description: 'Поездка на работу',
    occurredAt: dayThisMonth(6),
    version: 1,
    accountId: 'acc-card',
    categoryId: 'cat-taxi',
  },
  {
    id: 'tx-cafe-1',
    type: 'expense',
    amount: 300_000,
    description: 'Кофе с собой',
    occurredAt: dayThisMonth(4),
    version: 1,
    accountId: 'acc-cash',
    categoryId: 'cat-cafe',
  },
  {
    id: 'tx-taxi-prev',
    type: 'expense',
    amount: 950_000,
    description: 'Поездка в аэропорт',
    occurredAt: dayPrevMonth(12),
    version: 1,
    accountId: 'acc-card',
    categoryId: 'cat-taxi',
  },
]

function renderSection() {
  render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <QueryClientProvider client={createQueryClient()}>
        <AccountRepositoryProvider repository={createMockAccountRepository([])}>
          <CategoryRepositoryProvider repository={createMockCategoryRepository(CATEGORIES)}>
            <TransactionRepositoryProvider
              repository={createMockTransactionRepository(TRANSACTIONS)}
            >
              <ThemeProvider>
                <BottomSheetProvider>
                  <CategorySection
                    kind="expense"
                    cursor={currentMonth()}
                    transactions={TRANSACTIONS}
                    categories={CATEGORIES}
                  />
                </BottomSheetProvider>
              </ThemeProvider>
            </TransactionRepositoryProvider>
          </CategoryRepositoryProvider>
        </AccountRepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  )
}

async function openTaxiSheet() {
  await waitFor(() => expect(screen.getByTestId('home-category-cat-taxi')).toBeTruthy())
  fireEvent.press(screen.getByTestId('home-category-cat-taxi'))
  expect(screen.getByTestId('category-expenses-sheet')).toBeTruthy()
}

const taxiTransactions = TRANSACTIONS.filter((tx) => tx.categoryId === 'cat-taxi')

describe('CategoryCashflowSheet (expense kind)', () => {
  it('renders the period, total, and day groups for the category', async () => {
    renderSection()
    await openTaxiSheet()

    const now = new Date()
    expect(screen.getByTestId('category-expenses-period')).toHaveTextContent(
      monthRangeLabelShort(now.getFullYear(), now.getMonth()),
    )
    // The sheet's filtered query resolves asynchronously after the category
    // is selected; the totals and rows follow in the same render.
    await waitFor(() => expect(screen.getAllByTestId(/^category-expense-row-/)).toHaveLength(2))
    expect(screen.getByTestId('category-expenses-total')).toHaveTextContent(
      `${formatAmount(totalCashflow(taxiTransactions, currentMonth(), 'expense'))} потрачено`,
    )

    // Only this category's expenses of the selected month, one group per day.
    expect(screen.getAllByTestId(/^category-expense-row-/)).toHaveLength(2)
    expect(screen.getAllByTestId(/^category-expense-day-/)).toHaveLength(2)
    expect(screen.queryByTestId('category-expense-row-tx-cafe-1')).toBeNull()
    expect(screen.queryByTestId('category-expense-row-tx-taxi-prev')).toBeNull()
    expect(screen.getByText('Поездка в центр')).toBeTruthy()
  })

  it('switches the period with the in-sheet month navigator', async () => {
    renderSection()
    await openTaxiSheet()

    fireEvent.press(screen.getByTestId('category-expenses-prev-month'))

    const prev = previousMonth(currentMonth())
    await waitFor(() =>
      expect(screen.getByTestId('category-expenses-period')).toHaveTextContent(
        monthRangeLabelShort(prev.year, prev.month),
      ),
    )
    // The month switch issues a new filtered query; wait for its rows.
    await waitFor(() =>
      expect(screen.getByTestId('category-expense-row-tx-taxi-prev')).toBeTruthy(),
    )
    expect(screen.getAllByTestId(/^category-expense-row-/)).toHaveLength(1)
    expect(screen.getByTestId('category-expenses-total')).toHaveTextContent(
      `${formatAmount(totalCashflow(taxiTransactions, prev, 'expense'))} потрачено`,
    )
  })

  it('flips the day order with the sort toggle', async () => {
    renderSection()
    await openTaxiSheet()
    await waitFor(() => expect(screen.getAllByTestId(/^category-expense-day-/)).toHaveLength(2))

    const newestFirst = screen
      .getAllByTestId(/^category-expense-day-/)
      .map((node) => node.props.testID)
    fireEvent.press(screen.getByTestId('category-expenses-sort'))

    const oldestFirst = screen
      .getAllByTestId(/^category-expense-day-/)
      .map((node) => node.props.testID)
    expect(oldestFirst).toEqual([...newestFirst].reverse())
  })

  it('shows the empty state and a zero total for a month without expenses', async () => {
    renderSection()
    await openTaxiSheet()

    fireEvent.press(screen.getByTestId('category-expenses-prev-month'))
    fireEvent.press(screen.getByTestId('category-expenses-prev-month'))

    await waitFor(() => expect(screen.getByText('В этом месяце расходов нет')).toBeTruthy())
    expect(screen.queryAllByTestId(/^category-expense-row-/)).toHaveLength(0)
  })

  it('presents the expense-creation sheet from the footer button', async () => {
    renderSection()
    await openTaxiSheet()

    fireEvent.press(screen.getByTestId('category-new-expense-button'))
    await waitFor(() => expect(screen.getByTestId('category-new-expense-sheet')).toBeTruthy())
  })

  it('presents the category-edit sheet from the header pencil', async () => {
    renderSection()
    await openTaxiSheet()

    fireEvent.press(screen.getByTestId('category-expenses-edit'))
    await waitFor(() => expect(screen.getByTestId('category-edit-sheet')).toBeTruthy())
    expect(screen.getByDisplayValue('Такси')).toBeTruthy()
  })
})

// --- Income kind: same harness shape, income categories/transactions, and
// the income wording and ids -------------------------------------------------

const INCOME_CATEGORIES: Category[] = [
  {
    id: 'cat-salary',
    name: 'Зарплата',
    type: 'income',
    icon: 'cash',
    color: '#16a34a',
    version: 1,
  },
]

const INCOME_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-salary-1',
    type: 'income',
    amount: 1_500_000,
    description: 'Аванс',
    occurredAt: dayThisMonth(5),
    version: 1,
    accountId: 'acc-card',
    categoryId: 'cat-salary',
  },
  {
    id: 'tx-salary-prev',
    type: 'income',
    amount: 1_500_000,
    description: 'Зарплата за прошлый месяц',
    occurredAt: dayPrevMonth(10),
    version: 1,
    accountId: 'acc-card',
    categoryId: 'cat-salary',
  },
  {
    id: 'tx-taxi-noise',
    type: 'expense',
    amount: 400_000,
    description: 'Такси',
    occurredAt: dayThisMonth(6),
    version: 1,
    accountId: 'acc-card',
    categoryId: 'cat-taxi',
  },
]

function renderIncomeSection() {
  render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <QueryClientProvider client={createQueryClient()}>
        <AccountRepositoryProvider repository={createMockAccountRepository([])}>
          <CategoryRepositoryProvider repository={createMockCategoryRepository(INCOME_CATEGORIES)}>
            <TransactionRepositoryProvider
              repository={createMockTransactionRepository(INCOME_TRANSACTIONS)}
            >
              <ThemeProvider>
                <BottomSheetProvider>
                  <CategorySection
                    kind="income"
                    cursor={currentMonth()}
                    transactions={INCOME_TRANSACTIONS}
                    categories={INCOME_CATEGORIES}
                  />
                </BottomSheetProvider>
              </ThemeProvider>
            </TransactionRepositoryProvider>
          </CategoryRepositoryProvider>
        </AccountRepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  )
}

describe('CategoryCashflowSheet (income kind)', () => {
  it('shows the income breakdown, wording, and ids; expenses never appear', async () => {
    renderIncomeSection()

    await waitFor(() => expect(screen.getByTestId('income-category-cat-salary')).toBeTruthy())
    fireEvent.press(screen.getByTestId('income-category-cat-salary'))
    expect(screen.getByTestId('category-incomes-sheet')).toBeTruthy()

    await waitFor(() => expect(screen.getAllByTestId(/^category-income-row-/)).toHaveLength(1))
    expect(screen.getByTestId('category-incomes-total')).toHaveTextContent(
      `${formatAmount(1_500_000)} получено`,
    )
    expect(screen.getByText('Все доходы')).toBeTruthy()
    expect(screen.queryByTestId('category-income-row-tx-taxi-noise')).toBeNull()
    expect(screen.queryByTestId('category-income-row-tx-salary-prev')).toBeNull()

    fireEvent.press(screen.getByTestId('category-new-income-button'))
    await waitFor(() => expect(screen.getByTestId('category-new-income-sheet')).toBeTruthy())
  })

  it('shows the income empty state for a month without incomes', async () => {
    renderIncomeSection()

    await waitFor(() => expect(screen.getByTestId('income-category-cat-salary')).toBeTruthy())
    fireEvent.press(screen.getByTestId('income-category-cat-salary'))
    fireEvent.press(screen.getByTestId('category-incomes-prev-month'))
    fireEvent.press(screen.getByTestId('category-incomes-prev-month'))

    await waitFor(() => expect(screen.getByText('В этом месяце доходов нет')).toBeTruthy())
    expect(screen.queryAllByTestId(/^category-income-row-/)).toHaveLength(0)
  })
})
