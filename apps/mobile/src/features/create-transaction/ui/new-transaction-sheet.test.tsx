import { act } from 'react'
import { describe, expect, it } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/shared/config/theme'
import { createQueryClient } from '@/shared/lib/query/query-client'
import { AccountRepositoryProvider } from '@/entities/account/api/repository'
import { createMockAccountRepository } from '@/entities/account/model/mock-repository'
import { CategoryRepositoryProvider } from '@/entities/category/api/repository'
import { createMockCategoryRepository } from '@/entities/category/model/mock-repository'
import { TransactionRepositoryProvider } from '@/entities/transaction/api/repository'
import { createMockTransactionRepository } from '@/entities/transaction/model/mock-repository'
import { BottomSheetProvider } from '@/shared/ui/bottom-sheet/bottom-sheet-provider'
import type { BottomSheetRef } from '@/shared/ui/bottom-sheet'
import { NewTransactionSheet } from './new-transaction-sheet'

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

const ACCOUNTS = [
  {
    id: 'acc-rub-1',
    name: 'Карта',
    currency: 'RUB' as const,
    openingBalance: 0,
    manualAdjustment: 0,
  },
  {
    id: 'acc-rub-2',
    name: 'Наличные',
    currency: 'RUB' as const,
    openingBalance: 0,
    manualAdjustment: 0,
  },
  {
    id: 'acc-usd',
    name: 'Dollar',
    currency: 'USD' as const,
    openingBalance: 0,
    manualAdjustment: 0,
  },
]

const CATEGORIES = [
  { id: 'cat-cafe', name: 'Кафе', type: 'expense' as const, icon: 'cafe', color: '#a78bfa' },
  { id: 'cat-salary', name: 'Зарплата', type: 'income' as const, icon: 'cash', color: '#16a34a' },
]

async function renderSheet(kind: 'expense' | 'income' | 'transfer') {
  const transactionRepository = createMockTransactionRepository()
  const sheetRef = { current: null as BottomSheetRef | null }
  render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <QueryClientProvider client={createQueryClient()}>
        <AccountRepositoryProvider repository={createMockAccountRepository(ACCOUNTS)}>
          <CategoryRepositoryProvider repository={createMockCategoryRepository(CATEGORIES)}>
            <TransactionRepositoryProvider repository={transactionRepository}>
              <ThemeProvider>
                <BottomSheetProvider>
                  <NewTransactionSheet ref={sheetRef} kind={kind} />
                </BottomSheetProvider>
              </ThemeProvider>
            </TransactionRepositoryProvider>
          </CategoryRepositoryProvider>
        </AccountRepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  )
  await act(async () => {
    sheetRef.current?.present()
  })
  return transactionRepository
}

describe('NewTransactionSheet', () => {
  it('creates an expense with the chosen account and a type-matched category', async () => {
    const repository = await renderSheet('expense')

    expect(screen.getByText('Новый расход')).toBeTruthy()
    expect(screen.getByTestId('new-transaction-submit').props.accessibilityState.disabled).toBe(
      true,
    )

    fireEvent.changeText(screen.getByTestId('new-transaction-amount'), '250,00')
    fireEvent.press(screen.getByTestId('new-transaction-account-acc-rub-1'))
    fireEvent.press(screen.getByTestId('new-transaction-category-cat-cafe'))
    expect(screen.getByTestId('new-transaction-submit').props.accessibilityState.disabled).toBe(
      false,
    )

    fireEvent.press(screen.getByTestId('new-transaction-submit'))

    await waitFor(() => expect(repository.snapshot()).toHaveLength(1))
    const [created] = repository.snapshot()
    expect(created).toMatchObject({
      type: 'expense',
      amount: 25_000,
      accountId: 'acc-rub-1',
      categoryId: 'cat-cafe',
    })
  })

  it('offers only same-currency, distinct transfer destinations', async () => {
    await renderSheet('transfer')

    fireEvent.press(screen.getByTestId('new-transaction-from-acc-rub-1'))

    // The other RUB account is offered; the USD one and the source are not.
    await waitFor(() => expect(screen.getByTestId('new-transaction-to-acc-rub-2')).toBeTruthy())
    expect(screen.queryByTestId('new-transaction-to-acc-rub-1')).toBeNull()
    expect(screen.queryByTestId('new-transaction-to-acc-usd')).toBeNull()
  })

  it('keeps the submit disabled for amounts below one minor unit', async () => {
    await renderSheet('income')

    fireEvent.changeText(screen.getByTestId('new-transaction-amount'), '0')
    fireEvent.press(screen.getByTestId('new-transaction-account-acc-rub-1'))
    fireEvent.press(screen.getByTestId('new-transaction-category-cat-salary'))

    expect(screen.getByTestId('new-transaction-submit').props.accessibilityState.disabled).toBe(
      true,
    )
  })
})
