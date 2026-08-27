import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { LocalSyncConflict } from '@expense-tracker/local-data'
import type { LocalDbApi } from '@/shared/lib/local-db'
import type { SyncController } from '@/shared/lib/local-db'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const versionConflict: LocalSyncConflict = {
  id: 'c1',
  entity: 'category',
  entityId: 'cat-1',
  opId: 'op-1',
  kind: 'version',
  baseVersion: 1,
  serverVersion: 2,
  localState: { name: 'Кафе', type: 'expense', icon: 'cafe', color: '#fff' },
  serverState: { version: 2, deleted: false, data: { name: 'Coffee', type: 'expense', icon: 'cafe', color: '#000' } },
  createdAt: '2026-01-01T00:00:00Z',
}

const deletedConflict: LocalSyncConflict = {
  id: 'c2',
  entity: 'account',
  entityId: 'acc-1',
  opId: null,
  kind: 'deleted',
  baseVersion: 3,
  serverVersion: 4,
  localState: { name: 'Карта' },
  serverState: { version: 4, deleted: true },
  createdAt: '2026-01-01T00:00:00Z',
}

const runMock = vi.fn<(force?: boolean) => Promise<{ status: string }>>()
const listMock = vi.fn<() => Promise<LocalSyncConflict[]>>()
const keepLocalMock = vi.fn<(id: string) => Promise<void>>()
const takeServerMock = vi.fn<(id: string) => Promise<void>>()
const markResolvedMock = vi.fn<(id: string) => Promise<void>>()
const localDbApi = {
  sync: {
    run: runMock,
    resume: vi.fn<() => Promise<void>>(),
    getState: vi.fn<() => Promise<{ running: boolean; paused: boolean; lastRunAt: null }>>(async () => ({ running: false, paused: false, lastRunAt: null })),
    subscribe: vi.fn<(listener: () => void) => Promise<() => void>>(async () => () => {}),
    readStatus: vi.fn<() => Promise<unknown>>(),
    listUnresolvedConflicts: listMock,
    getConflict: vi.fn<(id: string) => Promise<unknown | null>>(),
    resolveConflictKeepLocal: keepLocalMock,
    resolveConflictTakeServer: takeServerMock,
    markConflictResolved: markResolvedMock,
  },
  meta: {
    getOwnerUserId: vi.fn<() => Promise<string | null>>(),
    setOwnerUserId: vi.fn<(userId: string) => Promise<void>>(),
    wipeLocalData: vi.fn<() => Promise<void>>(),
  },
} as unknown as LocalDbApi

// Mock the inner module (not the barrel): the real sync composable imports
// './local-db' directly, and vitest mocks by resolved file path - mocking
// here covers both the barrel re-export and the composable's own import.
vi.mock('@/shared/lib/local-db/local-db', () => ({
  getLocalDbApi: () => Promise.resolve(localDbApi),
  onLocalDataChanged: () => () => {},
}))

const { ConflictCenter } = await import('@/features/sync-conflicts')
const { provideSyncController } = await import('@/shared/lib/local-db')

const hostState: { controller: SyncController | null } = { controller: null }

function mountConflictCenter() {
  const Host = defineComponent({
    setup() {
      hostState.controller = provideSyncController({ isAuthenticated: () => true })
      return () => h('div', [h(ConflictCenter)])
    },
  })
  mountWithProviders(Host)
}

// reka-ui teleports the open dialog to document.body, so assertions query
// the document instead of the component wrapper.
function queryAll(selector: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(selector)]
}

function conflictItems(): HTMLElement[] {
  return queryAll('[data-testid^="conflict-item-"]')
}

async function mountOpenWithConflicts(conflicts: LocalSyncConflict[]) {
  listMock.mockResolvedValue(conflicts)
  const wrapper = mountConflictCenter()
  hostState.controller!.conflictsOpen.value = true
  await flushPromises()
  return wrapper
}

function findButton(label: string): HTMLElement {
  const button = queryAll('button').find((b) => b.textContent === label)
  expect(button).toBeDefined()
  return button!
}

describe('ConflictCenter', () => {
  beforeEach(() => {
    runMock.mockReset().mockResolvedValue({ status: 'completed' })
    keepLocalMock.mockReset().mockResolvedValue(undefined)
    takeServerMock.mockReset().mockResolvedValue(undefined)
    markResolvedMock.mockReset().mockResolvedValue(undefined)
    listMock.mockReset()
  })

  it('lists unresolved conflicts with their subjects', async () => {
    await mountOpenWithConflicts([versionConflict, deletedConflict])
    const items = conflictItems()
    expect(items).toHaveLength(2)
    expect(items[0]?.textContent).toContain('Кафе')
    expect(items[1]?.textContent).toContain('Карта')
  })

  it('offers keep-local / take-server on version conflicts and resolves via RPC', async () => {
    await mountOpenWithConflicts([versionConflict])

    await findButton('Keep mine').click()
    await flushPromises()
    expect(keepLocalMock).toHaveBeenCalledWith('c1')
    // Resolution always refreshes and kicks a follow-up cycle.
    expect(runMock).toHaveBeenCalled()

    runMock.mockClear()
    await findButton('Take server version').click()
    await flushPromises()
    expect(takeServerMock).toHaveBeenCalledWith('c1')
  })

  it('offers only review on delete-vs-edit conflicts (delete-wins already applied)', async () => {
    await mountOpenWithConflicts([deletedConflict])
    const item = document.querySelector<HTMLElement>('[data-testid="conflict-item-c2"]')

    expect(item?.textContent).not.toContain('Keep mine')
    expect(item?.textContent).not.toContain('Take server version')

    await findButton('Mark reviewed').click()
    await flushPromises()
    expect(markResolvedMock).toHaveBeenCalledWith('c2')
    expect(keepLocalMock).not.toHaveBeenCalled()
  })

  it('shows the empty state when nothing is unresolved', async () => {
    await mountOpenWithConflicts([])
    expect(document.querySelector('[data-testid="conflict-center-empty"]')).not.toBeNull()
  })
})
