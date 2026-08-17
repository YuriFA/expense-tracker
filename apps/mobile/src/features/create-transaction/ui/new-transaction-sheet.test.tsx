// Create-transaction sheet + form behavior. The sheet-level harness
// exercises the composite through the presented sheet (mode wiring, option
// filtering, submit payloads, blocking, errors). The full-reset assertion
// renders the form standalone: on success the container dismisses the
// sheet, which unmounts the form under the jest @gorhom mock, so post-
// submit field state is only observable below the container.

import { act } from 'react'
import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import { UnknownReferencesError, type Transaction } from '@expense-tracker/api'
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
import { NewTransactionForm } from './new-transaction-form'
import { NewTransactionSheet } from './new-transaction-sheet'

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

const ACCOUNTS = [
  {
    id: 'acc-rub-1',
    name: 'Карта',
    currency: 'RUB' as const,
    openingBalance: 0,
    manualAdjustment: 0,
    version: 1,
  },
  {
    id: 'acc-rub-2',
    name: 'Наличные',
    currency: 'RUB' as const,
    openingBalance: 0,
    manualAdjustment: 0,
    version: 1,
  },
  {
    id: 'acc-usd',
    name: 'Dollar',
    currency: 'USD' as const,
    openingBalance: 0,
    manualAdjustment: 0,
    version: 1,
  },
]

const CATEGORIES = [
  {
    id: 'cat-cafe',
    name: 'Кафе',
    type: 'expense' as const,
    icon: 'cafe',
    color: '#a78bfa',
    version: 1,
  },
  {
    id: 'cat-salary',
    name: 'Зарплата',
    type: 'income' as const,
    icon: 'cash',
    color: '#16a34a',
    version: 1,
  },
]

function providers(
  client: ReturnType<typeof createQueryClient>,
  transactionRepository: ReturnType<typeof createMockTransactionRepository>,
  children: React.ReactNode,
) {
  return (
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <QueryClientProvider client={client}>
        <AccountRepositoryProvider repository={createMockAccountRepository(ACCOUNTS)}>
          <CategoryRepositoryProvider repository={createMockCategoryRepository(CATEGORIES)}>
            <TransactionRepositoryProvider repository={transactionRepository}>
              <ThemeProvider>
                <BottomSheetProvider>{children}</BottomSheetProvider>
              </ThemeProvider>
            </TransactionRepositoryProvider>
          </CategoryRepositoryProvider>
        </AccountRepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

async function renderSheet(
  kind: 'expense' | 'income' | 'transfer',
  transactionRepository = createMockTransactionRepository(),
) {
  const sheetRef = { current: null as BottomSheetRef | null }
  const queryClient = createQueryClient()
  const tree = (k: 'expense' | 'income' | 'transfer') => (
    <QueryClientProvider client={queryClient}>
      <AccountRepositoryProvider repository={createMockAccountRepository(ACCOUNTS)}>
        <CategoryRepositoryProvider repository={createMockCategoryRepository(CATEGORIES)}>
          <TransactionRepositoryProvider repository={transactionRepository}>
            <ThemeProvider>
              <BottomSheetProvider>
                <NewTransactionSheet ref={sheetRef} kind={k} />
              </BottomSheetProvider>
            </ThemeProvider>
          </TransactionRepositoryProvider>
        </CategoryRepositoryProvider>
      </AccountRepositoryProvider>
    </QueryClientProvider>
  )
  const view = render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      {tree(kind)}
    </SafeAreaProvider>,
  )
  await act(async () => {
    sheetRef.current?.present()
  })
  return {
    transactionRepository,
    rerenderKind: async (k: 'expense' | 'income' | 'transfer') => {
      await act(async () => {
        view.rerender(
          <SafeAreaProvider
            initialMetrics={{
              insets: ZERO_INSETS,
              frame: { x: 0, y: 0, width: 375, height: 812 },
            }}
          >
            {tree(k)}
          </SafeAreaProvider>,
        )
      })
    },
  }
}

/** Standalone form harness (see the file comment for why reset is tested here). */
function renderForm(kind: 'expense' | 'income' | 'transfer') {
  const transactionRepository = createMockTransactionRepository()
  render(
    providers(
      createQueryClient(),
      transactionRepository,
      <NewTransactionForm kind={kind} onSuccess={jest.fn()} />,
    ),
  )
  return transactionRepository
}

/** The field components mount with the presented sheet, so their account/
 * category queries settle one tick later - await the chips before pressing. */
async function fillExpenseValid() {
  fireEvent.changeText(screen.getByTestId('new-transaction-amount'), '250,00')
  fireEvent.press(await screen.findByTestId('new-transaction-account-acc-rub-1'))
  fireEvent.press(await screen.findByTestId('new-transaction-category-cat-cafe'))
}

describe('NewTransactionSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates an expense with the chosen account and a type-matched category', async () => {
    const { transactionRepository: repository } = await renderSheet('expense')

    expect(screen.getByText('Новый расход')).toBeTruthy()

    await fillExpenseValid()
    fireEvent.press(screen.getByTestId('new-transaction-submit'))

    await waitFor(() => expect(repository.snapshot()).toHaveLength(1))
    const [created] = repository.snapshot()
    expect(created).toMatchObject({
      type: 'expense',
      amount: 25_000,
      accountId: 'acc-rub-1',
      categoryId: 'cat-cafe',
      description: '',
    })
  })

  it('offers only same-currency, distinct transfer destinations', async () => {
    await renderSheet('transfer')

    fireEvent.press(await screen.findByTestId('new-transaction-from-acc-rub-1'))

    // The other RUB account is offered; the USD one and the source are not.
    await waitFor(() => expect(screen.getByTestId('new-transaction-to-acc-rub-2')).toBeTruthy())
    expect(screen.queryByTestId('new-transaction-to-acc-rub-1')).toBeNull()
    expect(screen.queryByTestId('new-transaction-to-acc-usd')).toBeNull()
  })

  it('blocks a zero amount on submit with the field error visible', async () => {
    const { transactionRepository: repository } = await renderSheet('income')

    fireEvent.changeText(screen.getByTestId('new-transaction-amount'), '0')
    fireEvent.press(await screen.findByTestId('new-transaction-account-acc-rub-1'))
    fireEvent.press(await screen.findByTestId('new-transaction-category-cat-salary'))
    fireEvent.press(screen.getByTestId('new-transaction-submit'))

    expect(await screen.findByTestId('new-transaction-amount-error')).toHaveTextContent(
      'Некорректная сумма',
    )
    expect(repository.snapshot()).toHaveLength(0)
  })

  it('blocks a transfer submit without accounts with the field errors visible', async () => {
    const { transactionRepository: repository } = await renderSheet('transfer')

    fireEvent.changeText(screen.getByTestId('new-transaction-amount'), '100')
    fireEvent.press(screen.getByTestId('new-transaction-submit'))

    expect(await screen.findByTestId('new-transaction-from-error')).toHaveTextContent(
      'Выберите счёт списания',
    )
    expect(repository.snapshot()).toHaveLength(0)
  })

  it('re-initializes the form when the flow kind changes', async () => {
    const { rerenderKind } = await renderSheet('expense')

    fireEvent.changeText(screen.getByTestId('new-transaction-amount'), '123')
    fireEvent.press(await screen.findByTestId('new-transaction-account-acc-rub-1'))
    expect(
      screen.getByTestId('new-transaction-account-acc-rub-1').props.accessibilityState.selected,
    ).toBe(true)

    await rerenderKind('transfer')

    // Typed amount and the old variant's selection are gone; the new
    // variant's fields render empty (no chip preselected).
    expect(screen.getByTestId('new-transaction-amount').props.value).toBe('')
    expect(screen.getByTestId('new-transaction-from-list')).toBeTruthy()
    expect(screen.queryByTestId('new-transaction-account-list')).toBeNull()
    expect(
      screen.getByTestId('new-transaction-from-acc-rub-1').props.accessibilityState.selected,
    ).toBe(false)
    expect(screen.getByText('Сначала выберите счёт списания')).toBeTruthy()
  })

  it('surfaces a repository error at the root slot and keeps the values', async () => {
    const repository = {
      ...createMockTransactionRepository(),
      create: () => Promise.reject(new UnknownReferencesError('Unknown account')),
    }
    await renderSheet('expense', repository)

    await fillExpenseValid()
    fireEvent.press(screen.getByTestId('new-transaction-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('new-transaction-error')).toHaveTextContent(
        'Указан неизвестный счёт или категория',
      ),
    )
    expect(screen.getByTestId('new-transaction-amount').props.value).toBe('250,00')
  })

  it('blocks a double submit while the create is pending', async () => {
    let resolveCreate: (transaction: Transaction) => void = () => {}
    const create = jest.fn(
      () => new Promise<Transaction>((resolve) => void (resolveCreate = resolve)),
    )
    const repository = { ...createMockTransactionRepository(), create }
    await renderSheet('expense', repository)

    await fillExpenseValid()
    fireEvent.press(screen.getByTestId('new-transaction-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('new-transaction-submit').props.accessibilityState.disabled).toBe(
        true,
      ),
    )
    fireEvent.press(screen.getByTestId('new-transaction-submit'))
    expect(create).toHaveBeenCalledTimes(1)

    resolveCreate({
      id: 'tx-new',
      type: 'expense',
      amount: 25_000,
      description: '',
      occurredAt: new Date().toISOString(),
      version: 1,
      accountId: 'acc-rub-1',
      categoryId: 'cat-cafe',
    })
  })
})

describe('NewTransactionForm', () => {
  it('fully resets after a successful submit - selections do not survive', async () => {
    const repository = renderForm('expense')

    await fillExpenseValid()
    fireEvent.press(screen.getByTestId('new-transaction-submit'))

    await waitFor(() => expect(repository.snapshot()).toHaveLength(1))
    expect(screen.getByTestId('new-transaction-amount').props.value).toBe('')
    expect(
      screen.getByTestId('new-transaction-account-acc-rub-1').props.accessibilityState.selected,
    ).toBe(false)
    expect(
      screen.getByTestId('new-transaction-category-cat-cafe').props.accessibilityState.selected,
    ).toBe(false)
  })
})
