// Second-device household check (household-join design D7): a mismatching
// server-reported household prompts the shared choice dialog and applies it;
// a null/matching marker records the household silently; fetch failures
// (offline) skip the check. Real local-data meta/rebase against a real test
// database; only the household API is mocked.

import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { act, render, waitFor } from '@testing-library/react-native'
import { Alert } from 'react-native'
import { QueryClientProvider } from '@tanstack/react-query'
import type { Household } from '@expense-tracker/api'
import { createTestDatabase } from '@expense-tracker/local-data/testing'
import { getLastHousehold, setLastHousehold } from '@expense-tracker/local-data'
import { DatabaseProvider } from '@/shared/lib/db/database-context'
import type { LocalDatabase } from '@/shared/lib/db/database'
import { createQueryClient } from '@/shared/lib/query/query-client'
import { HouseholdRebaseGuard } from './household-rebase-guard'

const HOUSEHOLD_NEW: Household = {
  id: 'hh-new',
  createdAt: '2026-08-01T00:00:00.000Z',
  name: 'Семья',
  members: [
    {
      userId: '22222222-2222-4222-8222-222222222222',
      email: 'owner@example.com',
      displayName: null,
      role: 'owner',
      joinedAt: '2026-08-01T00:00:00.000Z',
    },
  ],
}

// The closures dereference these only at render/handler time, so the lazy
// jest factory never sees an uninitialized binding.
let mockAuthStatus: 'authenticated' | 'anonymous' = 'authenticated'

jest.mock('@/entities/household', () => ({
  householdApi: { getHousehold: jest.fn() },
}))

jest.mock('@/entities/session', () => ({
  useAuth: () => ({
    status: mockAuthStatus,
    user: { id: '11111111-1111-4111-8111-111111111111', email: 'user@example.com' },
  }),
}))

const mockController = { runNow: jest.fn() }

jest.mock('@/shared/lib/sync/sync-context', () => ({
  useSyncController: () => mockController,
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { householdApi } = require('@/entities/household') as {
  householdApi: { getHousehold: ReturnType<typeof jest.fn> }
}

let db: LocalDatabase
let alertButtons: { text: string; onPress?: () => void; style?: string }[]

beforeEach(async () => {
  jest.clearAllMocks()
  db = await createTestDatabase()
  mockAuthStatus = 'authenticated'
  alertButtons = []
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    alertButtons = (buttons ?? []) as typeof alertButtons
    return
  })
  householdApi.getHousehold.mockResolvedValue(HOUSEHOLD_NEW)
})

function renderGuard() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <DatabaseProvider database={db}>
        <HouseholdRebaseGuard />
      </DatabaseProvider>
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

describe('HouseholdRebaseGuard', () => {
  it('prompts the choice for a stale second device and rebases on carry', async () => {
    setLastHousehold(db, 'hh-old')
    renderGuard()

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1))
    expect(alertButtons.map((button) => button.text)).toEqual([
      'Перенести данные',
      'Начать с чистого листа',
    ])

    await pressAlertButton('Перенести данные')
    // The real rebase stamps the marker for the new household.
    await waitFor(() => expect(getLastHousehold(db)).toBe('hh-new'))
    expect(mockController.runNow).toHaveBeenCalledTimes(1)
  })

  it('applies the clean choice on answer', async () => {
    setLastHousehold(db, 'hh-old')
    renderGuard()

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1))
    await pressAlertButton('Начать с чистого листа')

    await waitFor(() => expect(getLastHousehold(db)).toBe('hh-new'))
    expect(mockController.runNow).toHaveBeenCalledTimes(1)
  })

  it('records the household silently on first run (null marker)', async () => {
    renderGuard()

    await waitFor(() => expect(householdApi.getHousehold).toHaveBeenCalledTimes(1))
    expect(Alert.alert).not.toHaveBeenCalled()
    expect(getLastHousehold(db)).toBe('hh-new')
  })

  it('does nothing when the marker already matches', async () => {
    setLastHousehold(db, 'hh-new')
    renderGuard()

    await waitFor(() => expect(householdApi.getHousehold).toHaveBeenCalledTimes(1))
    expect(Alert.alert).not.toHaveBeenCalled()
    expect(getLastHousehold(db)).toBe('hh-new')
    expect(mockController.runNow).not.toHaveBeenCalled()
  })

  it('skips the check silently when the household cannot be fetched', async () => {
    householdApi.getHousehold.mockRejectedValue(new Error('offline'))
    renderGuard()

    await waitFor(() => expect(householdApi.getHousehold).toHaveBeenCalledTimes(1))
    // Nothing prompted, nothing recorded - the next foreground retries.
    expect(Alert.alert).not.toHaveBeenCalled()
    expect(getLastHousehold(db)).toBeNull()
  })

  it('does not fetch while anonymous', async () => {
    mockAuthStatus = 'anonymous'
    renderGuard()

    // Give the (early-returned) effect a chance to run.
    await act(async () => {
      await Promise.resolve()
    })
    expect(householdApi.getHousehold).not.toHaveBeenCalled()
    expect(Alert.alert).not.toHaveBeenCalled()
  })
})
