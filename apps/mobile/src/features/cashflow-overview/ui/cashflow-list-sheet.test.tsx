// CashflowListSheet behavior over the AllCashflowCard harness (it owns the
// sheet's open flow): the opened month renders its day-grouped rows, a
// tapped row delegates to the page-composed edit action, and rows stay
// non-interactive when no edit action is composed.

import { describe, expect, it, jest } from '@jest/globals'
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
import { BottomSheetProvider } from '@/shared/ui/bottom-sheet/bottom-sheet-provider'
import { AllCashflowCard } from './all-cashflow-card'
import { CASHFLOW_KIND_VIEWS } from './kind'
import { currentMonth } from '../model/selectors'

const ZERO_INSETS = { top: 0, right: 0, left: 0, bottom: 0 }

function toIso(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).toISOString()
}

function dayThisMonth(day: number): string {
  const now = new Date()
  return toIso(new Date(now.getFullYear(), now.getMonth(), Math.min(day, now.getDate()), 12))
}

const CATEGORIES: Category[] = [
  { id: 'cat-taxi', name: 'Такси', type: 'expense', icon: 'car', color: '#7c5cff', version: 1 },
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
]

const { ids } = CASHFLOW_KIND_VIEWS.expense

function renderCard(onEditTransaction?: (id: string) => void) {
  const onNewTransaction = jest.fn()
  render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <QueryClientProvider client={createQueryClient()}>
        <CategoryRepositoryProvider repository={createMockCategoryRepository(CATEGORIES)}>
          <TransactionRepositoryProvider repository={createMockTransactionRepository(TRANSACTIONS)}>
            <ThemeProvider>
              <BottomSheetProvider>
                <AllCashflowCard
                  kind="expense"
                  cursor={currentMonth()}
                  transactions={TRANSACTIONS}
                  categories={CATEGORIES}
                  onNewTransaction={onNewTransaction}
                  onEditTransaction={onEditTransaction}
                />
              </BottomSheetProvider>
            </ThemeProvider>
          </TransactionRepositoryProvider>
        </CategoryRepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  )
  return { onNewTransaction }
}

async function openListSheet() {
  fireEvent.press(screen.getByTestId(ids.allCard))
  await waitFor(() => expect(screen.getByTestId(`${ids.listRow}-tx-taxi-1`)).toBeTruthy())
}

describe('CashflowListSheet', () => {
  it('delegates a tapped row to the page-composed edit action', async () => {
    const onEditTransaction = jest.fn()
    renderCard(onEditTransaction)
    await openListSheet()

    fireEvent.press(screen.getByTestId(`${ids.listRow}-tx-taxi-1`))

    expect(onEditTransaction).toHaveBeenCalledWith('tx-taxi-1')
  })

  it('renders rows as non-interactive when no edit action is composed', async () => {
    renderCard()
    await openListSheet()

    expect(screen.getByTestId(`${ids.listRow}-tx-taxi-1`).props.accessibilityState.disabled).toBe(
      true,
    )
  })
})
