// Sync status badge tests: hidden while anonymous, conflict state first,
// paused state, pending count, and the settled "synced" state.

import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import { QueryClientProvider } from '@tanstack/react-query'
import { createTestDatabase } from '@/shared/lib/db/testing/test-database'
import { DatabaseProvider } from '@/shared/lib/db/database-context'
import type { LocalDatabase } from '@/shared/lib/db/database'
import { createQueryClient } from '@/shared/lib/query/query-client'
import { enqueueOperation } from '@/shared/lib/db/outbox'
import { recordConflict } from '@/shared/lib/sync/conflicts'
import { SyncStatusBadge } from './sync-status-badge'

const mockUseAuth = { status: 'authenticated', replace: jest.fn() }
const mockController: {
  engineState: { running: boolean; paused: boolean; lastRunAt: string | null }
  runNow: () => void
  presentConflicts: () => void
} = {
  engineState: { running: false, paused: false, lastRunAt: null },
  runNow: jest.fn(),
  presentConflicts: jest.fn(),
}

jest.mock('@/entities/session', () => ({
  useAuth: () => ({ status: mockUseAuth.status }),
}))

jest.mock('@/shared/lib/sync/sync-context', () => ({
  useSyncController: () => mockController,
}))

let db: LocalDatabase

beforeEach(async () => {
  jest.clearAllMocks()
  db = await createTestDatabase()
})

function renderBadge() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <DatabaseProvider database={db}>
        <SyncStatusBadge />
      </DatabaseProvider>
    </QueryClientProvider>,
  )
}

describe('SyncStatusBadge', () => {
  it('renders nothing while anonymous', () => {
    mockUseAuth.status = 'anonymous'
    const { queryByTestId } = renderBadge()
    expect(queryByTestId('sync-status-badge')).toBeNull()
  })

  it('shows the synced state and taps into a manual run', async () => {
    mockUseAuth.status = 'authenticated'
    mockController.engineState = {
      running: false,
      paused: false,
      lastRunAt: '2026-08-16T12:00:00.000Z',
    }
    renderBadge()

    const value = await screen.findByTestId('sync-status-value')
    expect(value.props.children).toBe('Синхронизировано')
    fireEvent.press(screen.getByTestId('sync-status-badge'))
    expect(mockController.runNow).toHaveBeenCalledTimes(1)
  })

  it('prioritizes the unresolved conflict count', async () => {
    mockUseAuth.status = 'authenticated'
    mockController.engineState = { running: false, paused: false, lastRunAt: null }
    db.transaction((tx) => {
      enqueueOperation(tx, {
        entity: 'category',
        entityId: 'c1',
        op: 'upsert',
        payload: {},
        baseVersion: 0,
      })
      recordConflict(tx, {
        entity: 'category',
        entityId: 'c1',
        opId: null,
        kind: 'version',
        baseVersion: 1,
        serverVersion: 2,
        localState: null,
        serverState: { version: 2, deleted: false },
      })
    })
    renderBadge()

    await waitFor(() =>
      expect(screen.getByTestId('sync-status-value').props.children).toBe('Конфликты: 1'),
    )
    fireEvent.press(screen.getByTestId('sync-status-badge'))
    expect(mockController.presentConflicts).toHaveBeenCalledTimes(1)
    expect(mockController.runNow).not.toHaveBeenCalled()
  })

  it('shows the paused state when the session expired', async () => {
    mockUseAuth.status = 'authenticated'
    mockController.engineState = { running: false, paused: true, lastRunAt: null }
    renderBadge()

    const value = await screen.findByTestId('sync-status-value')
    expect(value.props.children).toBe('Сессия истекла')
  })

  it('shows the pending outbox count', async () => {
    mockUseAuth.status = 'authenticated'
    mockController.engineState = { running: false, paused: false, lastRunAt: null }
    db.transaction((tx) => {
      enqueueOperation(tx, {
        entity: 'category',
        entityId: 'c1',
        op: 'upsert',
        payload: {},
        baseVersion: 0,
      })
      enqueueOperation(tx, {
        entity: 'category',
        entityId: 'c2',
        op: 'upsert',
        payload: {},
        baseVersion: 0,
      })
    })
    renderBadge()

    await waitFor(() =>
      expect(screen.getByTestId('sync-status-value').props.children).toBe('2 ожидает отправки'),
    )
  })

  it('shows the in-flight state', async () => {
    mockUseAuth.status = 'authenticated'
    mockController.engineState = { running: true, paused: false, lastRunAt: null }
    renderBadge()

    const value = await screen.findByTestId('sync-status-value')
    expect(value.props.children).toBe('Синхронизация…')
  })
})
