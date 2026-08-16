import { describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import type { Account, Category, Transaction } from '@expense-tracker/api'
import { ThemeProvider } from '@/shared/config/theme'
import { createQueryClient } from '@/shared/lib/query/query-client'
import { AccountRepositoryProvider } from '@/entities/account/api/repository'
import { createMockAccountRepository } from '@/entities/account/model/mock-repository'
import { CategoryRepositoryProvider } from '@/entities/category/api/repository'
import { createMockCategoryRepository } from '@/entities/category/model/mock-repository'
import { TransactionRepositoryProvider } from '@/entities/transaction/api/repository'
import { createMockTransactionRepository } from '@/entities/transaction/model/mock-repository'
import { BottomSheetProvider } from '@/shared/ui/bottom-sheet/bottom-sheet-provider'
import { DashboardScreen } from './dashboard-screen'
import { formatAmount } from '../model/format'
import {
  currentMonth,
  expensesInMonth,
  monthlyBalance,
  previousMonth,
  totalBalance,
  totalExpenses,
} from '../model/selectors'

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

// --- Date-relative domain fixtures (current month has data, previous too,
// the month before the previous is empty) ----------------------------------

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

const ACCOUNTS: Account[] = [
  {
    id: 'acc-cash',
    name: 'Наличные',
    currency: 'RUB',
    openingBalance: 500_000,
    manualAdjustment: 0,
  },
  {
    id: 'acc-card',
    name: 'Карта',
    currency: 'RUB',
    openingBalance: 3_200_000,
    manualAdjustment: 200_000,
  },
]

const CATEGORIES: Category[] = [
  { id: 'cat-taxi', name: 'Такси', type: 'expense', icon: 'car', color: '#7c5cff' },
  { id: 'cat-cafe', name: 'Кафе', type: 'expense', icon: 'cafe', color: '#a78bfa' },
  { id: 'cat-salary', name: 'Зарплата', type: 'income', icon: 'cash', color: '#16a34a' },
]

const TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-salary',
    type: 'income',
    amount: 1_500_000,
    description: 'Зарплата',
    occurredAt: dayThisMonth(3),
    version: 1,
    accountId: 'acc-card',
    categoryId: 'cat-salary',
  },
  {
    id: 'tx-taxi',
    type: 'expense',
    amount: 1_931_300,
    description: 'Поездка в центр',
    occurredAt: dayThisMonth(2),
    version: 1,
    accountId: 'acc-card',
    categoryId: 'cat-taxi',
  },
  {
    id: 'tx-cafe',
    type: 'expense',
    amount: 300_000,
    description: 'Кофе с собой',
    occurredAt: dayThisMonth(6),
    version: 1,
    accountId: 'acc-cash',
    categoryId: 'cat-cafe',
  },
  {
    id: 'tx-transfer',
    type: 'transfer',
    amount: 500_000,
    description: 'Снятие наличных',
    occurredAt: dayThisMonth(4),
    version: 1,
    fromAccountId: 'acc-card',
    toAccountId: 'acc-cash',
  },
  {
    id: 'tx-prev-salary',
    type: 'income',
    amount: 1_500_000,
    description: 'Зарплата',
    occurredAt: dayPrevMonth(3),
    version: 1,
    accountId: 'acc-card',
    categoryId: 'cat-salary',
  },
  {
    id: 'tx-prev-taxi',
    type: 'expense',
    amount: 950_000,
    description: 'Поездка в аэропорт',
    occurredAt: dayPrevMonth(12),
    version: 1,
    accountId: 'acc-card',
    categoryId: 'cat-taxi',
  },
]

// The mock repository computes balances as opening + manualAdjustment.
const expectedAccounts = () =>
  ACCOUNTS.map((account) => ({
    ...account,
    balance: account.openingBalance + account.manualAdjustment,
  }))

function renderDashboard() {
  const accountRepository = createMockAccountRepository(ACCOUNTS)
  const categoryRepository = createMockCategoryRepository(CATEGORIES)
  const transactionRepository = createMockTransactionRepository(TRANSACTIONS)
  const queryClient = createQueryClient()

  render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <QueryClientProvider client={queryClient}>
        <AccountRepositoryProvider repository={accountRepository}>
          <CategoryRepositoryProvider repository={categoryRepository}>
            <TransactionRepositoryProvider repository={transactionRepository}>
              <ThemeProvider>
                <BottomSheetProvider>
                  <DashboardScreen />
                </BottomSheetProvider>
              </ThemeProvider>
            </TransactionRepositoryProvider>
          </CategoryRepositoryProvider>
        </AccountRepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  )

  return { accountRepository, categoryRepository, transactionRepository }
}

const expensesRowCount = () => screen.queryAllByTestId(/^home-expense-row-/).length

describe('DashboardScreen (Home)', () => {
  it('renders the sections with the expenses total for the current month', async () => {
    renderDashboard()

    expect(screen.getByTestId('screen-dashboard')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Все расходы')).toBeTruthy())

    expect(screen.getByTestId('home-quick-accounts')).toBeTruthy()
    expect(screen.getByTestId('home-quick-income')).toBeTruthy()
    expect(screen.getByTestId('home-quick-goals')).toBeTruthy()

    expect(screen.getByText('Расходы')).toBeTruthy()
    const expected = formatAmount(totalExpenses(TRANSACTIONS, currentMonth()))
    await waitFor(() => expect(screen.getByText(expected)).toBeTruthy())
    expect(screen.getByTestId('home-new-category')).toBeTruthy()
  })

  it('switches the summary mode via the bottom sheet', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByText('Все расходы')).toBeTruthy())

    fireEvent.press(screen.getByTestId('home-summary-mode'))
    expect(screen.getByTestId('home-mode-sheet')).toBeTruthy()

    fireEvent.press(screen.getByTestId('home-mode-option-total-balance'))
    expect(screen.queryByTestId('home-mode-sheet')).toBeNull()
    expect(screen.getByText('Баланс общий')).toBeTruthy()
    await waitFor(() =>
      expect(screen.getByText(formatAmount(totalBalance(expectedAccounts())))).toBeTruthy(),
    )

    fireEvent.press(screen.getByTestId('home-summary-mode'))
    fireEvent.press(screen.getByTestId('home-mode-option-monthly-balance'))
    await waitFor(() =>
      expect(
        screen.getByText(formatAmount(monthlyBalance(TRANSACTIONS, currentMonth()))),
      ).toBeTruthy(),
    )
  })

  it('navigates to the previous month and shows its expenses total', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByText('Все расходы')).toBeTruthy())

    fireEvent.press(screen.getByTestId('home-period-prev'))
    const prev = previousMonth(currentMonth())
    // The amount also appears in the category breakdown row - at least once.
    await waitFor(() =>
      expect(
        screen.getAllByText(formatAmount(totalExpenses(TRANSACTIONS, prev))).length,
      ).toBeGreaterThanOrEqual(1),
    )
  })

  it('shows the empty state for a month without expenses', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByText('Все расходы')).toBeTruthy())

    fireEvent.press(screen.getByTestId('home-period-prev'))
    fireEvent.press(screen.getByTestId('home-period-prev'))
    await waitFor(() =>
      expect(screen.getAllByText('В этом месяце расходов нет').length).toBeGreaterThanOrEqual(1),
    )
  })

  it('opens the all-expenses sheet with the period expenses', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByText('Все расходы')).toBeTruthy())

    fireEvent.press(screen.getByTestId('home-all-expenses'))
    const expectedCount = expensesInMonth(TRANSACTIONS, currentMonth()).length
    await waitFor(() => expect(expensesRowCount()).toBe(expectedCount))
  })

  it('opens a category-filtered expense sheet', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByText('Все расходы')).toBeTruthy())

    await waitFor(() => expect(screen.getByTestId('home-category-cat-taxi')).toBeTruthy())
    fireEvent.press(screen.getByTestId('home-category-cat-taxi'))
    expect(screen.getByTestId('home-expenses-sheet')).toBeTruthy()
    await waitFor(() =>
      expect(expensesRowCount()).toBe(
        expensesInMonth(TRANSACTIONS, currentMonth()).filter((t) => t.categoryId === 'cat-taxi')
          .length,
      ),
    )
  })

  it('creates a category through the sheet and shows it afterwards', async () => {
    const { categoryRepository } = renderDashboard()
    await waitFor(() => expect(screen.getByText('Все расходы')).toBeTruthy())

    fireEvent.press(screen.getByTestId('home-new-category'))
    expect(screen.getByTestId('home-new-category-sheet')).toBeTruthy()

    fireEvent.changeText(screen.getByTestId('home-new-category-name'), 'Транспорт')
    fireEvent.press(screen.getByTestId('home-new-category-icon-bus'))
    fireEvent.press(screen.getByTestId('home-new-category-type-income'))
    fireEvent.press(screen.getByTestId('home-new-category-submit'))

    await waitFor(() => expect(categoryRepository.snapshot()).toHaveLength(4))
    // Form resets after a successful submit.
    await waitFor(() => expect(screen.getByTestId('home-new-category-name').props.value).toBe(''))
  })
})
