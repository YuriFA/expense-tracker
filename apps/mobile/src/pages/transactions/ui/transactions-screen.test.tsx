import { describe, expect, it } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import type { Category, Transaction } from '@expense-tracker/api'
import { ThemeProvider } from '@/shared/config/theme'
import { createQueryClient } from '@/shared/lib/query/query-client'
import { CategoryRepositoryProvider } from '@/entities/category'
import { createMockCategoryRepository } from '@/shared/lib/testing/mock-category-repository'
import { TransactionRepositoryProvider } from '@/entities/transaction'
import { createMockTransactionRepository } from '@/shared/lib/testing/mock-transaction-repository'
import { TransactionsScreen } from './transactions-screen'

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

const CATEGORIES: Category[] = [
  { id: 'cat-cafe', name: 'Кафе', type: 'expense', icon: 'cafe', color: '#a78bfa', version: 1 },
]

const TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-aug-1',
    type: 'expense',
    amount: 400_000,
    description: 'Кофе',
    occurredAt: '2026-08-10T12:00:00.000Z',
    version: 1,
    accountId: 'acc-1',
    categoryId: 'cat-cafe',
  },
  {
    id: 'tx-aug-2',
    type: 'income',
    amount: 1_000_000,
    description: 'Зарплата',
    occurredAt: '2026-08-03T09:00:00.000Z',
    version: 1,
    accountId: 'acc-1',
    categoryId: 'cat-cafe',
  },
  {
    id: 'tx-jul',
    type: 'expense',
    amount: 700_000,
    description: 'Июль',
    occurredAt: '2026-07-15T12:00:00.000Z',
    version: 1,
    accountId: 'acc-1',
    categoryId: 'cat-cafe',
  },
]

function renderScreen() {
  render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <QueryClientProvider client={createQueryClient()}>
        <CategoryRepositoryProvider repository={createMockCategoryRepository(CATEGORIES)}>
          <TransactionRepositoryProvider repository={createMockTransactionRepository(TRANSACTIONS)}>
            <ThemeProvider>
              <TransactionsScreen />
            </ThemeProvider>
          </TransactionRepositoryProvider>
        </CategoryRepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  )
}

describe('TransactionsScreen', () => {
  it('lists the current month transactions of all types', async () => {
    renderScreen()

    await waitFor(() => expect(screen.getByTestId('tx-row-tx-aug-1')).toBeTruthy())
    expect(screen.getByTestId('tx-row-tx-aug-2')).toBeTruthy()
    expect(screen.queryByTestId('tx-row-tx-jul')).toBeNull()
    expect(screen.getByText('Кофе')).toBeTruthy()
  })

  it('navigates months and shows the empty state', async () => {
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('tx-row-tx-aug-1')).toBeTruthy())

    fireEvent.press(screen.getByTestId('tx-month-prev'))
    await waitFor(() => expect(screen.getByTestId('tx-row-tx-jul')).toBeTruthy())
    expect(screen.queryByTestId('tx-row-tx-aug-1')).toBeNull()

    fireEvent.press(screen.getByTestId('tx-month-next'))
    fireEvent.press(screen.getByTestId('tx-month-next'))
    await waitFor(() => expect(screen.getByText('В этом месяце транзакций нет')).toBeTruthy())
  })
})
