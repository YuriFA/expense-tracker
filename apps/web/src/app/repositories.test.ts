import { describe, it, expect, vi } from 'vitest'
import { createApp, h } from 'vue'
import { NotFoundError } from '@expense-tracker/api'
import { provideRepositories } from './repositories'
import { ACCOUNT_REPOSITORY_KEY } from '@/entities/account'
import { CATEGORY_REPOSITORY_KEY } from '@/entities/category'
import { TRANSACTION_REPOSITORY_KEY } from '@/entities/transaction'
import type { LocalDbApi } from '@/shared/lib/local-db'

// A deferred handshake: the worker's ready signal resolves late, so calls
// made before it must queue behind the promise (design D1).
function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function createFakeApi(): LocalDbApi {
  return {
    accounts: {
      getAll: vi.fn<() => Promise<Array<{ id: string; name: string }>>>(() => Promise.resolve([{ id: 'a1', name: 'Main' }])),
      getById: vi.fn<(id: string) => Promise<null>>(() => Promise.resolve(null)),
      create: vi.fn<(payload: unknown) => Promise<unknown>>(),
      update: vi.fn<(id: string, payload: unknown) => Promise<unknown>>(),
      remove: vi.fn<(id: string) => Promise<void>>(),
    },
    categories: {
      getAll: vi.fn<() => Promise<unknown[]>>(() => Promise.resolve([])),
      getById: vi.fn<(id: string) => Promise<null>>(() => Promise.resolve(null)),
      create: vi.fn<(payload: unknown) => Promise<unknown>>(),
      update: vi.fn<(id: string, payload: unknown) => Promise<unknown>>(),
      remove: vi.fn<(id: string) => Promise<void>>(),
    },
    transactions: {
      getAll: vi.fn<() => Promise<unknown[]>>(() => Promise.resolve([])),
      getById: vi.fn<(id: string) => Promise<null>>(() => Promise.resolve(null)),
      create: vi.fn<(payload: unknown) => Promise<unknown>>(),
      update: vi.fn<(id: string, payload: unknown) => Promise<unknown>>(),
      remove: vi.fn<(id: string) => Promise<void>>(),
      query: vi.fn<() => Promise<{ transactions: unknown[]; nextCursor: null }>>(() => Promise.resolve({ transactions: [], nextCursor: null })),
    },
    sync: {
      run: vi.fn<(force?: boolean) => Promise<unknown>>(),
      resume: vi.fn<() => Promise<void>>(),
      getState: vi.fn<() => Promise<unknown>>(),
      subscribe: vi.fn<(listener: () => void) => Promise<() => void>>(),
      readStatus: vi.fn<() => Promise<unknown>>(),
      listUnresolvedConflicts: vi.fn<() => Promise<unknown[]>>(),
      getConflict: vi.fn<(id: string) => Promise<unknown | null>>(),
      resolveConflictKeepLocal: vi.fn<(id: string) => Promise<void>>(),
      resolveConflictTakeServer: vi.fn<(id: string) => Promise<void>>(),
      markConflictResolved: vi.fn<(id: string) => Promise<void>>(),
    },
    meta: {
      getOwnerUserId: vi.fn<() => Promise<string | null>>(),
      setOwnerUserId: vi.fn<(userId: string) => Promise<void>>(),
      wipeLocalData: vi.fn<() => Promise<void>>(),
    },
  } as unknown as LocalDbApi
}

const handshake = createDeferred<LocalDbApi>()
const fakeApi = createFakeApi()

vi.mock('@/shared/lib/local-db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/local-db')>()),
  getLocalDbApi: () => handshake.promise,
}))

function mountWithRepositories() {
  const app = createApp({ setup: () => () => h('div') })
  provideRepositories(app)
  app.mount(document.createElement('div'))
  return (app as unknown as { _context: { provides: Record<symbol, unknown> } })._context.provides
}

describe('provideRepositories', () => {
  it('registers all three repository keys on the app', () => {
    const provides = mountWithRepositories()
    expect(provides[ACCOUNT_REPOSITORY_KEY as unknown as symbol]).toBeDefined()
    expect(provides[CATEGORY_REPOSITORY_KEY as unknown as symbol]).toBeDefined()
    expect(provides[TRANSACTION_REPOSITORY_KEY as unknown as symbol]).toBeDefined()
  })

  it('queues calls made before the ready handshake, then forwards to the worker RPC', async () => {
    const provides = mountWithRepositories()
    const accounts = provides[ACCOUNT_REPOSITORY_KEY as unknown as symbol] as {
      getAll: () => Promise<Array<{ id: string; name: string }>>
    }

    // Called before the worker signaled ready: must not throw or hit the API.
    const pending = accounts.getAll()
    expect(fakeApi.accounts.getAll).not.toHaveBeenCalled()

    handshake.resolve(fakeApi)
    await expect(pending).resolves.toEqual([{ id: 'a1', name: 'Main' }])
    expect(fakeApi.accounts.getAll).toHaveBeenCalledTimes(1)

    // Subsequent calls go straight through.
    await expect(accounts.getAll()).resolves.toHaveLength(1)
    expect(fakeApi.accounts.getAll).toHaveBeenCalledTimes(2)
  })

  it('rehydrates worker-side RepositoryErrors from their surviving name', async () => {
    const provides = mountWithRepositories()
    const accounts = provides[ACCOUNT_REPOSITORY_KEY as unknown as symbol] as {
      getById: (id: string) => Promise<unknown>
    }
    vi.mocked(fakeApi.accounts.getById)
      .mockRejectedValueOnce(Object.assign(new Error('account not found'), { name: 'NotFoundError' }))
      .mockRejectedValueOnce(Object.assign(new Error('account not found'), { name: 'NotFoundError' }))

    await expect(accounts.getById('missing')).rejects.toBeInstanceOf(NotFoundError)
    await expect(accounts.getById('missing')).rejects.toMatchObject({ code: 'not-found' })
  })
})
