// Debtor form behavior: name validation, create with note, rename-conflict
// error mapping at the root slot, edit prefill with CAS update, and delete
// with confirm. The form renders standalone (the @gorhom mock degrades
// BottomSheetInput to a plain input under jest).

import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { Alert } from 'react-native'
import { QueryClientProvider } from '@tanstack/react-query'
import type { Debtor } from '@expense-tracker/api'
import { ThemeProvider } from '@/shared/config/theme'
import { createQueryClient } from '@/shared/lib/query/query-client'
import { DebtRepositoryProvider } from '@/entities/debt'
import {
  createMockDebtOperationRepository,
  createMockDebtorRepository,
} from '@/shared/lib/testing/mock-debt-repositories'
import { DebtorForm } from './debtor-form-sheet'

const ANNA: Debtor = { id: 'debtor-anna', name: 'Анна', note: 'коллега', version: 3 }

function renderForm(debtor?: Debtor, initial: Debtor[] = debtor ? [ANNA] : []) {
  const debtorRepository = createMockDebtorRepository(initial)
  const debtOperationRepository = createMockDebtOperationRepository([])
  render(
    <QueryClientProvider client={createQueryClient()}>
      <DebtRepositoryProvider
        debtorRepository={debtorRepository}
        debtOperationRepository={debtOperationRepository}
      >
        <ThemeProvider>
          <DebtorForm debtor={debtor} sheetRef={{ current: null }} />
        </ThemeProvider>
      </DebtRepositoryProvider>
    </QueryClientProvider>,
  )
  return debtorRepository
}

describe('DebtorForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)
  })

  it('blocks an empty name with the field error and no create call', async () => {
    const repository = renderForm()

    fireEvent.press(screen.getByTestId('debts-debtor-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('debts-debtor-name-error')).toHaveTextContent('Введите имя'),
    )
    expect(repository.calls.create).toBe(0)
  })

  it('creates a debtor with name and note', async () => {
    const repository = renderForm()

    fireEvent.changeText(screen.getByTestId('debts-debtor-name'), 'Анна')
    fireEvent.changeText(screen.getByTestId('debts-debtor-note'), 'коллега')
    await waitFor(() => expect(screen.getByTestId('debts-debtor-submit')).toBeEnabled())
    fireEvent.press(screen.getByTestId('debts-debtor-submit'))

    await waitFor(() => expect(repository.calls.create).toBe(1))
    expect(repository.snapshot()[0]).toMatchObject({ name: 'Анна', note: 'коллега' })
  })

  it('maps a duplicate name to the root error and keeps the values', async () => {
    renderForm(undefined, [ANNA])
    // Create an Анна while an Анна already exists: the mock flags duplicates.
    fireEvent.changeText(screen.getByTestId('debts-debtor-name'), 'Анна')
    await waitFor(() => expect(screen.getByTestId('debts-debtor-submit')).toBeEnabled())
    fireEvent.press(screen.getByTestId('debts-debtor-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('debts-debtor-error')).toHaveTextContent('Уже существует'),
    )
    expect(screen.getByTestId('debts-debtor-name')).toHaveProp('value', 'Анна')
  })

  it('edits with the record CAS version', async () => {
    const repository = renderForm(ANNA)

    fireEvent.changeText(screen.getByTestId('debts-debtor-name'), 'Анна П.')
    await waitFor(() => expect(screen.getByTestId('debts-debtor-submit')).toBeEnabled())
    fireEvent.press(screen.getByTestId('debts-debtor-submit'))

    await waitFor(() => expect(repository.calls.update).toBe(1))
    expect(repository.snapshot()[0]).toMatchObject({ name: 'Анна П.', version: 4 })
  })

  it('deletes through the confirm alert', async () => {
    const repository = renderForm(ANNA)

    fireEvent.press(screen.getByTestId('debts-debtor-delete'))
    expect(Alert.alert).toHaveBeenCalledWith(
      'Удалить должника?',
      undefined,
      expect.arrayContaining([expect.objectContaining({ text: 'Удалить' })]),
    )

    const alertMock = jest.mocked(Alert.alert)
    const deleteButton = alertMock.mock.calls[0]?.[2]?.find(
      (button: { text?: string }) => button.text === 'Удалить',
    )
    if (!deleteButton) throw new Error('delete confirmation button missing')
    await deleteButton.onPress?.()

    await waitFor(() => expect(repository.calls.remove).toBe(1))
    expect(repository.snapshot()).toHaveLength(0)
  })
})
