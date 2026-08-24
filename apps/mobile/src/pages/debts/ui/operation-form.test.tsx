// Operation form behavior: kind switch and direction control visibility,
// keypad amount validation, over-repayment warning (warn, never block),
// debtor-required validation, repository error mapping at the root slot,
// and the edit variant's CAS version + immutable context rows.

import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { Alert } from 'react-native'
import { QueryClientProvider } from '@tanstack/react-query'
import { UnknownReferencesError, type DebtOperation, type Debtor } from '@expense-tracker/api'
import { ThemeProvider } from '@/shared/config/theme'
import { createQueryClient } from '@/shared/lib/query/query-client'
import { DebtRepositoryProvider } from '@/entities/debt'
import {
  createMockDebtOperationRepository,
  createMockDebtorRepository,
} from '@/shared/lib/testing/mock-debt-repositories'
import { BottomSheetProvider } from '@/shared/ui/bottom-sheet/bottom-sheet-provider'
import { OperationForm } from './operation-form'

const DEBTORS: Debtor[] = [
  { id: 'debtor-anna', name: 'Анна', note: '', version: 1 },
  { id: 'debtor-sergey', name: 'Сергей', note: '', version: 1 },
]

const EXISTING: DebtOperation[] = [
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
]

function renderForm(
  props: Partial<Parameters<typeof OperationForm>[0]> = {},
  {
    debtors = DEBTORS,
    operations = EXISTING,
  }: { debtors?: Debtor[]; operations?: DebtOperation[] } = {},
) {
  const debtorRepository = createMockDebtorRepository(debtors)
  const debtOperationRepository = createMockDebtOperationRepository(operations)
  render(
    <QueryClientProvider client={createQueryClient()}>
      <DebtRepositoryProvider
        debtorRepository={debtorRepository}
        debtOperationRepository={debtOperationRepository}
      >
        <ThemeProvider>
          {/* The form mounts its own picker sheets, so it needs the sheet host. */}
          <BottomSheetProvider>
            <OperationForm onSuccess={jest.fn()} {...props} />
          </BottomSheetProvider>
        </ThemeProvider>
      </DebtRepositoryProvider>
    </QueryClientProvider>,
  )
  return { debtorRepository, debtOperationRepository }
}

function typeAmount(digits: string) {
  for (const key of digits) {
    fireEvent.press(screen.getByTestId(`debts-operation-key-${key}`))
  }
}

describe('OperationForm (create)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('blocks submit without a debtor and with no amount', async () => {
    const { debtOperationRepository } = renderForm()
    typeAmount('100')

    fireEvent.press(screen.getByTestId('debts-operation-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('debts-operation-debtor-error')).toHaveTextContent(
        'Выберите должника',
      ),
    )
    expect(debtOperationRepository.calls.create).toBe(0)
  })

  it('creates through the picker with kind and direction switches', async () => {
    const { debtOperationRepository } = renderForm()

    // Долг → Списание (the segmented kind switch).
    fireEvent.press(screen.getByTestId('debts-operation-kind-repayment'))
    // Direction: receivable → payable.
    fireEvent.press(screen.getByTestId('debts-operation-direction-payable'))
    // Debtor picker.
    fireEvent.press(screen.getByTestId('debts-operation-debtor'))
    // The debtors query resolves async; the options appear inside the sheet.
    await waitFor(() =>
      expect(screen.getByTestId('debts-debtor-option-debtor-sergey')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('debts-debtor-option-debtor-sergey'))
    typeAmount('1500')
    await waitFor(() => expect(screen.getByTestId('debts-operation-submit')).toBeEnabled())

    fireEvent.press(screen.getByTestId('debts-operation-submit'))

    await waitFor(() => expect(debtOperationRepository.calls.create).toBe(1))
    // snapshot()[0] is the pre-seeded fixture; the created record is last.
    expect(debtOperationRepository.snapshot().at(-1)).toMatchObject({
      debtorId: 'debtor-sergey',
      direction: 'payable',
      kind: 'repayment',
      amount: 150_000,
    })
  })

  it('fixes direction and hides the debtor picker when opened from a debtor sheet', () => {
    renderForm({ fixed: { debtorId: 'debtor-anna', direction: 'receivable' } })

    expect(screen.queryByTestId('debts-operation-direction')).toBeNull()
    expect(screen.queryByTestId('debts-operation-debtor')).toBeNull()
    expect(screen.getByText('Направление')).toBeTruthy()
    expect(screen.getByText('Мне должны')).toBeTruthy()
  })

  it('warns on over-repayment but still accepts the operation', async () => {
    const { debtOperationRepository } = renderForm()
    // Remaining receivable balance for Анна is 5 000,00 ₽ (op-1).
    fireEvent.press(screen.getByTestId('debts-operation-debtor'))
    await waitFor(() => expect(screen.getByTestId('debts-debtor-option-debtor-anna')).toBeTruthy())
    fireEvent.press(screen.getByTestId('debts-debtor-option-debtor-anna'))
    fireEvent.press(screen.getByTestId('debts-operation-kind-repayment'))
    typeAmount('6000')

    await waitFor(() => expect(screen.getByTestId('debts-operation-over-repayment')).toBeTruthy())

    await waitFor(() => expect(screen.getByTestId('debts-operation-submit')).toBeEnabled())
    fireEvent.press(screen.getByTestId('debts-operation-submit'))
    await waitFor(() => expect(debtOperationRepository.calls.create).toBe(1))
    expect(debtOperationRepository.snapshot().at(-1)?.amount).toBe(600_000)
  })

  it('maps a repository error to the root slot and keeps the values', async () => {
    const { debtOperationRepository } = renderForm()
    debtOperationRepository.failNextCreateWith(
      new UnknownReferencesError('Debtor not found', {
        apiCode: 'DEBT_OPERATION_DEBTOR_NOT_FOUND',
      }),
    )

    fireEvent.press(screen.getByTestId('debts-operation-debtor'))
    await waitFor(() => expect(screen.getByTestId('debts-debtor-option-debtor-anna')).toBeTruthy())
    fireEvent.press(screen.getByTestId('debts-debtor-option-debtor-anna'))
    typeAmount('100')
    await waitFor(() => expect(screen.getByTestId('debts-operation-submit')).toBeEnabled())
    fireEvent.press(screen.getByTestId('debts-operation-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('debts-operation-error')).toHaveTextContent(
        'Указан неизвестный счёт или категория',
      ),
    )
    expect(screen.getByTestId('debts-operation-amount')).toHaveTextContent('100')
  })
})

describe('OperationForm (edit)', () => {
  it('prefills, keeps context immutable, and saves with the CAS version', async () => {
    const { debtOperationRepository } = renderForm({ operation: EXISTING[0] })

    await waitFor(() => expect(screen.getByText('Анна')).toBeTruthy())
    expect(screen.getByText('Долг')).toBeTruthy()
    expect(screen.queryByTestId('debts-operation-kind')).toBeNull()

    // «5000» (5 000,00 ₽) + key 5 → «50005» = 50 005,00 ₽.
    typeAmount('5')
    await waitFor(() => expect(screen.getByTestId('debts-operation-submit')).toBeEnabled())

    fireEvent.press(screen.getByTestId('debts-operation-submit'))

    await waitFor(() => expect(debtOperationRepository.calls.update).toBe(1))
    expect(debtOperationRepository.snapshot()[0]).toMatchObject({
      id: 'op-1',
      amount: 5_000_500,
      version: 2,
    })
  })

  it('deletes through the confirm alert (always allowed)', async () => {
    const { debtOperationRepository } = renderForm({ operation: EXISTING[0] })
    const alertMock = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)

    fireEvent.press(screen.getByTestId('debts-operation-delete'))
    expect(Alert.alert).toHaveBeenCalledWith(
      'Удалить операцию?',
      undefined,
      expect.arrayContaining([expect.objectContaining({ text: 'Удалить' })]),
    )

    const deleteButton = alertMock.mock.calls[0]?.[2]?.find(
      (button: { text?: string }) => button.text === 'Удалить',
    )
    if (!deleteButton) throw new Error('delete confirmation button missing')
    await deleteButton.onPress?.()

    await waitFor(() => expect(debtOperationRepository.calls.remove).toBe(1))
    expect(debtOperationRepository.snapshot()).toHaveLength(0)
  })
})
