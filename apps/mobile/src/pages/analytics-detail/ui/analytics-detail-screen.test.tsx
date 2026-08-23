import { describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import type { Category, Transaction } from '@expense-tracker/api'
import { currentPeriod, periodRangeLabel, shiftPeriod } from '@expense-tracker/dates'
import { ThemeProvider } from '@/shared/config/theme'
import { createQueryClient } from '@/shared/lib/query/query-client'
import { CategoryRepositoryProvider } from '@/entities/category'
import { createMockCategoryRepository } from '@/shared/lib/testing/mock-category-repository'
import { TransactionRepositoryProvider } from '@/entities/transaction'
import { createMockTransactionRepository } from '@/shared/lib/testing/mock-transaction-repository'
import type { AnalyticsDirection } from '@/features/analytics'
import { AnalyticsDetailScreen } from './analytics-detail-screen'

// ScreenHeader's back affordance defaults to router.back() (mocked; this
// screen itself never navigates programmatically).
const mockBack = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }))

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

const CATEGORIES: Category[] = [
  { id: 'cat-taxi', name: 'Такси', type: 'expense', icon: 'car', color: '#6366f1', version: 1 },
  { id: 'cat-cafe', name: 'Кафе', type: 'expense', icon: 'cafe', color: '#f97316', version: 1 },
  {
    id: 'cat-salary',
    name: 'Зарплата',
    type: 'income',
    icon: 'cash',
    color: '#22c55e',
    version: 1,
  },
]

// Current-month fixtures follow the transactions-screen test convention:
// hardcoded August 2026 instants against the runtime's current month.
const TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-taxi',
    type: 'expense',
    amount: 400_000,
    occurredAt: '2026-08-10T12:00:00.000Z',
    version: 1,
    accountId: 'acc-1',
    categoryId: 'cat-taxi',
  },
  {
    id: 'tx-cafe',
    type: 'expense',
    amount: 100_000,
    occurredAt: '2026-08-12T12:00:00.000Z',
    version: 1,
    accountId: 'acc-1',
    categoryId: 'cat-cafe',
  },
]

function renderScreen(direction: AnalyticsDirection = 'expense') {
  render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <QueryClientProvider client={createQueryClient()}>
        <CategoryRepositoryProvider repository={createMockCategoryRepository(CATEGORIES)}>
          <TransactionRepositoryProvider repository={createMockTransactionRepository(TRANSACTIONS)}>
            <ThemeProvider>
              <AnalyticsDetailScreen direction={direction} />
            </ThemeProvider>
          </TransactionRepositoryProvider>
        </CategoryRepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  )
}

describe('AnalyticsDetailScreen', () => {
  it('opens on the current month with the breakdown, totals, and percentages', async () => {
    renderScreen()

    await waitFor(() => expect(screen.getByTestId('analytics-total-row')).toBeTruthy())
    expect(screen.getByText(periodRangeLabel(currentPeriod('month')))).toBeTruthy()
    // 400 000 + 100 000 minor = 5 000 ₽ total (total line + summary row);
    // 80% / 20% shares.
    expect(screen.getAllByText('5 000 ₽')).toHaveLength(2)
    expect(screen.getByText('4 000 ₽')).toBeTruthy()
    expect(screen.getByText('80%')).toBeTruthy()
    expect(screen.getByText('1 000 ₽')).toBeTruthy()
    expect(screen.getByText('20%')).toBeTruthy()
    expect(screen.getByText('Все расходы')).toBeTruthy()
    expect(screen.getByTestId('analytics-category-cat-taxi')).toBeTruthy()
    expect(screen.getByTestId('analytics-category-cat-cafe')).toBeTruthy()
  })

  it('switching the period kind resets to the current period of that kind', async () => {
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('analytics-total-row')).toBeTruthy())

    fireEvent.press(screen.getByTestId('analytics-period-week'))
    expect(screen.getByText(periodRangeLabel(currentPeriod('week')))).toBeTruthy()

    fireEvent.press(screen.getByTestId('analytics-period-year'))
    expect(screen.getByText(periodRangeLabel(currentPeriod('year')))).toBeTruthy()
  })

  it('arrows step to the adjacent period and update the range label', async () => {
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('analytics-total-row')).toBeTruthy())

    fireEvent.press(screen.getByTestId('analytics-period-prev'))
    expect(screen.getByText(periodRangeLabel(shiftPeriod(currentPeriod('month'), -1)))).toBeTruthy()

    fireEvent.press(screen.getByTestId('analytics-period-next'))
    fireEvent.press(screen.getByTestId('analytics-period-next'))
    expect(screen.getByText(periodRangeLabel(shiftPeriod(currentPeriod('month'), 1)))).toBeTruthy()
  })

  it('shows the empty state for a future period (navigation is never blocked)', async () => {
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('analytics-total-row')).toBeTruthy())

    fireEvent.press(screen.getByTestId('analytics-period-next'))
    await waitFor(() => expect(screen.getByText('Нет расходов за этот период')).toBeTruthy())
    expect(screen.getByText(periodRangeLabel(shiftPeriod(currentPeriod('month'), 1)))).toBeTruthy()
  })

  it('renders the income copy for the income direction', async () => {
    renderScreen('income')

    await waitFor(() => expect(screen.getByText('Нет доходов за этот период')).toBeTruthy())
    expect(screen.getByText('Доходы')).toBeTruthy()
  })
})
