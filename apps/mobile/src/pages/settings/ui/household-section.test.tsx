// Settings household card (household-join design D6): display name with the
// owner email prefix fallback + members count, the join-by-code sheet
// (alphabet validation, submit → API → the shared choice dialog → home),
// and the leave flow (confirm alert → API → choice dialog → home; the
// owner-with-members error mapped to its RU wording). The household entity,
// the join feature and the router are mocked at their boundaries.

import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { Alert } from 'react-native'
import { QueryClientProvider } from '@tanstack/react-query'
import { RepositoryError, type Household } from '@expense-tracker/api'
import { createQueryClient } from '@/shared/lib/query/query-client'
import { BottomSheetProvider } from '@/shared/ui/bottom-sheet/bottom-sheet-provider'
import { HouseholdSection } from './household-section'

const OWNER_ID = '22222222-2222-4222-8222-222222222222'
const USER_ID = '11111111-1111-4111-8111-111111111111'

function household(overrides: Partial<Household> = {}): Household {
  return {
    id: 'hh-current',
    createdAt: '2026-08-01T00:00:00.000Z',
    name: 'Семья',
    members: [
      {
        userId: OWNER_ID,
        email: 'owner@example.com',
        displayName: null,
        role: 'owner',
        joinedAt: '2026-08-01T00:00:00.000Z',
      },
      {
        userId: USER_ID,
        email: 'wife@example.com',
        displayName: null,
        role: 'member',
        joinedAt: '2026-08-02T00:00:00.000Z',
      },
    ],
    ...overrides,
  }
}

let mockAuthStatus: 'authenticated' | 'anonymous' = 'authenticated'
let mockHousehold: Household | null = household()

const mockChooseHouseholdData: ReturnType<typeof jest.fn> = jest.fn()

jest.mock('@/entities/household', () => ({
  ...(jest.requireActual('@/entities/household') as Record<string, unknown>),
  householdApi: {
    joinByCode: jest.fn(),
    leave: jest.fn(),
  },
  useHousehold: () => ({ data: mockHousehold }),
}))

jest.mock('@/entities/session', () => ({
  useAuth: () => ({ status: mockAuthStatus }),
}))

jest.mock('@/features/household-join', () => ({
  useHouseholdJoin: () => ({ chooseHouseholdData: mockChooseHouseholdData }),
}))

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn() },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { householdApi } = require('@/entities/household') as {
  householdApi: {
    joinByCode: ReturnType<typeof jest.fn>
    leave: ReturnType<typeof jest.fn>
  }
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { router } = require('expo-router') as {
  router: { navigate: ReturnType<typeof jest.fn> }
}

let alertButtons: { text: string; onPress?: () => void; style?: string }[]

beforeEach(() => {
  jest.clearAllMocks()
  mockAuthStatus = 'authenticated'
  mockHousehold = household()
  alertButtons = []
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    alertButtons = (buttons ?? []) as typeof alertButtons
    return
  })
  householdApi.joinByCode.mockResolvedValue(household({ id: 'hh-joined' }))
  householdApi.leave.mockResolvedValue(household({ id: 'hh-personal' }))
  mockChooseHouseholdData.mockResolvedValue(undefined)
})

function renderSection() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <BottomSheetProvider>
        <HouseholdSection />
      </BottomSheetProvider>
    </QueryClientProvider>,
  )
}

async function pressAlertButton(text: string) {
  const button = await waitFor(() => {
    const found = alertButtons.find((candidate) => candidate.text === text)
    if (!found) throw new Error(`alert button "${text}" missing`)
    return found
  })
  await act(async () => {
    button.onPress?.()
  })
}

describe('HouseholdSection', () => {
  it('shows the household display name and the members count', () => {
    renderSection()

    expect(screen.getByTestId('settings-household-section')).toBeTruthy()
    expect(screen.getByTestId('settings-household-name')).toHaveTextContent('Семья')
    expect(screen.getByTestId('settings-household-members')).toHaveTextContent('Участников: 2')
  })

  it('falls back to the owner email prefix when the household has no name', () => {
    mockHousehold = household({ name: null })
    renderSection()

    expect(screen.getByTestId('settings-household-name')).toHaveTextContent('owner')
  })

  it('renders nothing while anonymous', () => {
    mockAuthStatus = 'anonymous'
    renderSection()

    expect(screen.queryByTestId('settings-household-section')).toBeNull()
  })

  it('validates the code shape in the join-by-code sheet before any API call', async () => {
    renderSection()
    fireEvent.press(screen.getByTestId('settings-join-by-code-button'))

    expect(await screen.findByTestId('settings-join-code-input')).toBeTruthy()

    // Ambiguous glyphs and a short code both fail the alphabet rule.
    fireEvent.changeText(screen.getByTestId('settings-join-code-input'), '0O1Iabcd')
    fireEvent.press(screen.getByTestId('settings-join-code-submit'))

    expect(await screen.findByTestId('settings-join-code-error')).toHaveTextContent(
      'Код — 8 символов (без 0, O, 1 и I)',
    )
    expect(householdApi.joinByCode).not.toHaveBeenCalled()
  })

  it('uppercases and trims the typed code on submit', async () => {
    renderSection()
    fireEvent.press(screen.getByTestId('settings-join-by-code-button'))
    await screen.findByTestId('settings-join-code-input')

    fireEvent.changeText(screen.getByTestId('settings-join-code-input'), 'ab23cd45')
    fireEvent.press(screen.getByTestId('settings-join-code-submit'))

    await waitFor(() => expect(householdApi.joinByCode).toHaveBeenCalledWith('AB23CD45'))
  })

  it('joins by code, applies the shared choice dialog and navigates home', async () => {
    renderSection()
    fireEvent.press(screen.getByTestId('settings-join-by-code-button'))
    await screen.findByTestId('settings-join-code-input')

    fireEvent.changeText(screen.getByTestId('settings-join-code-input'), 'AB23CD45')
    fireEvent.press(screen.getByTestId('settings-join-code-submit'))

    await waitFor(() =>
      expect(mockChooseHouseholdData).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'hh-joined' }),
      ),
    )
    expect(router.navigate).toHaveBeenCalledWith('/')
    // The sheet is gone after the flow completes.
    await waitFor(() => expect(screen.queryByTestId('settings-join-code-sheet')).toBeNull())
  })

  it('maps an invalid code to the root error in the sheet', async () => {
    householdApi.joinByCode.mockRejectedValue(
      new RepositoryError('bad code', 'invalid-payload', { apiCode: 'HOUSEHOLD_CODE_INVALID' }),
    )
    renderSection()
    fireEvent.press(screen.getByTestId('settings-join-by-code-button'))
    await screen.findByTestId('settings-join-code-input')

    fireEvent.changeText(screen.getByTestId('settings-join-code-input'), 'AB23CD45')
    fireEvent.press(screen.getByTestId('settings-join-code-submit'))

    expect(await screen.findByTestId('settings-join-code-form-error')).toHaveTextContent(
      'Неверный код домохозяйства',
    )
    expect(mockChooseHouseholdData).not.toHaveBeenCalled()
    expect(router.navigate).not.toHaveBeenCalled()
  })

  it('leaves through the confirm alert, then the choice dialog, then home', async () => {
    renderSection()

    fireEvent.press(screen.getByTestId('settings-leave-household-button'))
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1))
    expect(alertButtons.map((button) => button.text)).toEqual(['Отмена', 'Выйти'])

    await pressAlertButton('Выйти')

    await waitFor(() => expect(householdApi.leave).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(mockChooseHouseholdData).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'hh-personal' }),
      ),
    )
    expect(router.navigate).toHaveBeenCalledWith('/')
  })

  it('maps the owner-with-members rejection to its RU wording', async () => {
    householdApi.leave.mockRejectedValue(
      new RepositoryError('owner', 'conflict', { apiCode: 'HOUSEHOLD_OWNER_WITH_MEMBERS' }),
    )
    renderSection()

    fireEvent.press(screen.getByTestId('settings-leave-household-button'))
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1))
    await pressAlertButton('Выйти')

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(2))
    expect(Alert.alert).toHaveBeenLastCalledWith(
      'Не удалось выйти',
      'Владелец не может покинуть домохозяйство с участниками',
    )
    expect(mockChooseHouseholdData).not.toHaveBeenCalled()
  })
})
