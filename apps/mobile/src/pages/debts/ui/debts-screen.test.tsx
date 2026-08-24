// Debts screen tests: dual totals, direction sections (always rendered -
// empty hints + the per-section «+», design D9), settled-debtor reveal, the
// combined contact+debt sheet entry, and the D7 performance pin - the
// overview renders every figure from ONE operations read, never one per
// debtor.

import { describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import type { DebtOperation, Debtor } from '@expense-tracker/api'
import { ThemeProvider } from '@/shared/config/theme'
import { createQueryClient } from '@/shared/lib/query/query-client'
import { DebtRepositoryProvider } from '@/entities/debt'
import {
  createMockDebtOperationRepository,
  createMockDebtorRepository,
} from '@/shared/lib/testing/mock-debt-repositories'
import { BottomSheetProvider } from '@/shared/ui/bottom-sheet/bottom-sheet-provider'
import { formatAmount } from '@/shared/lib/format/format'
import { DebtsScreen } from './debts-screen'

const mockBack = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }))

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

const DEBTORS: Debtor[] = [
  { id: 'debtor-anna', name: 'Анна', note: '', version: 1 },
  { id: 'debtor-sergey', name: 'Сергей', note: '', version: 1 },
  { id: 'debtor-settled', name: 'Ольга', note: '', version: 1 },
]

const OPERATIONS: DebtOperation[] = [
  {
    id: 'op-1',
    debtorId: 'debtor-anna',
    direction: 'receivable',
    kind: 'debt',
    amount: 500_000,
    note: '',
    occurredAt: '2026-08-20T10:00:00.000Z',
    version: 1,
  },
  {
    id: 'op-2',
    debtorId: 'debtor-anna',
    direction: 'receivable',
    kind: 'repayment',
    amount: 150_000,
    note: '',
    occurredAt: '2026-08-21T10:00:00.000Z',
    version: 1,
  },
  {
    id: 'op-3',
    debtorId: 'debtor-sergey',
    direction: 'payable',
    kind: 'debt',
    amount: 200_000,
    note: '',
    occurredAt: '2026-08-22T10:00:00.000Z',
    version: 1,
  },
  {
    id: 'op-4',
    debtorId: 'debtor-settled',
    direction: 'receivable',
    kind: 'debt',
    amount: 100_000,
    note: '',
    occurredAt: '2026-08-19T10:00:00.000Z',
    version: 1,
  },
  {
    id: 'op-5',
    debtorId: 'debtor-settled',
    direction: 'receivable',
    kind: 'repayment',
    amount: 100_000,
    note: '',
    occurredAt: '2026-08-23T10:00:00.000Z',
    version: 1,
  },
]

function renderDebts({
  debtors = DEBTORS,
  operations = OPERATIONS,
}: {
  debtors?: Debtor[]
  operations?: DebtOperation[]
} = {}) {
  const debtorRepository = createMockDebtorRepository(debtors)
  const debtOperationRepository = createMockDebtOperationRepository(operations)

  const utils = render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 0, height: 0 }, insets: ZERO_INSETS }}
    >
      <ThemeProvider>
        <QueryClientProvider client={createQueryClient()}>
          <DebtRepositoryProvider
            debtorRepository={debtorRepository}
            debtOperationRepository={debtOperationRepository}
          >
            <BottomSheetProvider>
              <DebtsScreen />
            </BottomSheetProvider>
          </DebtRepositoryProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  )
  return { ...utils, debtorRepository, debtOperationRepository }
}

describe('DebtsScreen', () => {
  it('renders both direction totals from the derived operation sums', async () => {
    renderDebts()

    // A debtor row appears only once the queries resolve and the selectors
    // have run - the totals are computed by then too.
    await waitFor(() => expect(screen.getByTestId('debts-debtor-debtor-anna')).toBeTruthy())
    // receivable = 500 000 − 150 000 + (100 000 − 100 000) = 350 000
    expect(screen.getByTestId('debts-total-receivable')).toHaveTextContent(
      `${formatAmount(350_000)}`,
    )
    // payable = 200 000
    expect(screen.getByTestId('debts-total-payable')).toHaveTextContent(formatAmount(200_000))
  })

  it('splits debtors into direction sections without netting', async () => {
    renderDebts()

    await waitFor(() => expect(screen.getByTestId('debts-debtor-debtor-anna')).toBeTruthy())
    // Анна only in «Мне должны» with her receivable balance…
    expect(
      within(screen.getByTestId('debts-debtor-debtor-anna')).getByText(formatAmount(350_000)),
    ).toBeTruthy()
    // …Сергей only in «Я должен» (not even behind the receivable reveal).
    expect(
      within(screen.getByTestId('debts-debtor-debtor-sergey')).getByText(formatAmount(200_000)),
    ).toBeTruthy()
    expect(
      within(screen.getByTestId('debts-section-receivable')).getByText('Мне должны'),
    ).toBeTruthy()
    expect(within(screen.getByTestId('debts-section-payable')).getByText('Я должен')).toBeTruthy()
  })

  it('hides settled debtors behind a reveal row that carries the count', async () => {
    renderDebts()

    await waitFor(() => expect(screen.getByTestId('debts-settled-reveal-receivable')).toBeTruthy())
    expect(screen.getByTestId('debts-settled-reveal-receivable')).toHaveTextContent(
      'Показать рассчитавшихся (1)',
    )
    // The settled debtor's row is absent until revealed.
    expect(screen.queryByTestId('debts-debtor-debtor-settled')).toBeNull()

    fireEvent.press(screen.getByTestId('debts-settled-reveal-receivable'))
    expect(screen.getByTestId('debts-debtor-debtor-settled')).toBeTruthy()
    expect(
      within(screen.getByTestId('debts-debtor-debtor-settled')).getByText(formatAmount(0)),
    ).toBeTruthy()
  })

  it('renders both sections with empty hints and «+» affordances when no contacts exist', async () => {
    renderDebts({ debtors: [], operations: [] })

    await waitFor(() => expect(screen.getByTestId('debts-summary')).toBeTruthy())
    expect(screen.getByTestId('debts-section-add-receivable')).toBeTruthy()
    expect(screen.getByTestId('debts-section-add-payable')).toBeTruthy()
    expect(screen.getByText('Вам никто не должен')).toBeTruthy()
    expect(screen.getByText('Вы никому не должны')).toBeTruthy()
  })

  it('shows a section empty hint when nobody holds a balance in a direction', async () => {
    renderDebts({
      debtors: [DEBTORS[0]],
      operations: [OPERATIONS[2]], // only a payable operation for another debtor
    })

    await waitFor(() => expect(screen.getByText('Вам никто не должен')).toBeTruthy())
    expect(screen.getByTestId('debts-section-payable')).toBeTruthy()
  })

  it('opens the combined contact+debt sheet from a section «+» with the section direction', async () => {
    renderDebts()

    await waitFor(() => expect(screen.getByTestId('debts-section-add-payable')).toBeTruthy())
    // The @gorhom mock mounts sheet children only while presented.
    fireEvent.press(screen.getByTestId('debts-section-add-payable'))
    await waitFor(() => expect(screen.getByText('Кому должен')).toBeTruthy())
  })

  it('loads every figure from exactly ONE operations read (D7 perf pin)', async () => {
    const { debtOperationRepository } = renderDebts({
      debtors: DEBTORS,
      operations: OPERATIONS,
    })

    await waitFor(() => expect(screen.getByTestId('debts-debtor-debtor-anna')).toBeTruthy())
    await waitFor(() => expect(screen.getByTestId('debts-debtor-debtor-sergey')).toBeTruthy())

    expect(debtOperationRepository.calls.getAll).toBe(1)
  })
})
