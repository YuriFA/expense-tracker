// Integration tests of the mobile sync engine against the REAL backend:
// the same Go API the app talks to (register/login with the session cookie,
// push/pull over HTTP), with a real SQLite file per device. Node's fetch has
// no cookie jar, so each "device" wraps fetch with one (RN does this via its
// shared cookie store natively - the app path stays unchanged).
//
// Run explicitly (a running backend on :8080 is required):
//   SYNC_INTEGRATION_API=http://localhost:8080 pnpm test backend-integration
// Without the env var the suite skips (CI/dev default).

import { beforeAll, describe, expect, it, jest } from '@jest/globals'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  createApiClient,
  pushSyncOperations,
  type ApiClient,
  type SyncPushOperation,
} from '@expense-tracker/api'
import { createLocalAccountRepository } from '@/entities/account'
import { createLocalCategoryRepository } from '@/entities/category'
import { createLocalTransactionRepository } from '@/entities/transaction'
import type { LocalDatabase } from '@/shared/lib/db/database'
import { createTestDatabase } from '@/shared/lib/db/testing/test-database'
import { syncOutbox, categories as categoriesTable } from '@/shared/lib/db/schema'
import { eq } from 'drizzle-orm'
import { listUnresolvedConflicts, resolveConflictTakeServer } from './conflicts'
import { createApiTransport, createSyncEngine } from './sync-engine'

const API_URL = process.env.SYNC_INTEGRATION_API ?? ''
const maybe = API_URL ? describe : describe.skip

jest.setTimeout(60_000)

/** Minimal cookie jar over the fetch-family Request the api client builds. */
function createCookieFetch() {
  let cookie = ''
  return async (request: Request): Promise<Response> => {
    const headers = new Headers(request.headers)
    if (cookie) headers.set('cookie', cookie)
    const response = await fetch(request.url, {
      method: request.method,
      headers,
      body:
        request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
    })
    for (const line of response.headers.getSetCookie?.() ?? []) {
      const [name, value] = line.split(';')[0].split('=')
      if (name === 'session_id') cookie = `session_id=${value}`
    }
    return response
  }
}

interface Device {
  client: ApiClient
  db: LocalDatabase
  engine: ReturnType<typeof createSyncEngine>
  userId: string
  cleanup: () => void
}

/** Opens a device database + engine over a client that authenticates by
 * `authenticate` (register or login) and shares its cookie jar. */
async function createDevice(
  authenticate: (client: ApiClient) => Promise<string>,
  useFile: boolean,
): Promise<Device> {
  const client = createApiClient({ baseUrl: API_URL, fetch: createCookieFetch() })
  const userId = await authenticate(client)

  const dir = mkdtempSync(join(tmpdir(), 'et-sync-'))
  const db = await createTestDatabase(useFile ? join(dir, 'device.db') : ':memory:')
  const engine = createSyncEngine({
    db,
    transport: createApiTransport(client),
    onDataChanged: () => undefined,
  })
  return {
    client,
    db,
    engine,
    userId,
    cleanup: () => {
      try {
        rmSync(dir, { recursive: true, force: true })
      } catch {
        // best effort
      }
    },
  }
}

function registerAs(email: string) {
  return async (client: ApiClient) => {
    const { data: user } = await client.POST('/api/auth/register', {
      body: { email, password: 'test-password-123' },
    })
    if (!user) throw new Error('register failed')
    return user.id
  }
}

function loginAs(email: string) {
  return async (client: ApiClient) => {
    const { data: user } = await client.POST('/api/auth/login', {
      body: { email, password: 'test-password-123' },
    })
    if (!user) throw new Error('login failed')
    return user.id
  }
}

const CATEGORY = { name: 'Такси', type: 'expense' as const, icon: 'car', color: '#7c5cff' }

const mainEmail = `sync-it-${randomUUID()}@example.com`
let main: Device

beforeAll(async () => {
  main = await createDevice(registerAs(mainEmail), false)
})

maybe('sync engine vs real backend', () => {
  it('converges an offline create/edit/delete session on reconnect', async () => {
    const accountRepo = createLocalAccountRepository(main.db)
    const categoryRepo = createLocalCategoryRepository(main.db)
    const transactionRepo = createLocalTransactionRepository(main.db)

    // Offline: create, edit, delete - nothing leaves the device.
    const account = await accountRepo.create({
      name: 'Карта',
      currency: 'RUB',
      openingBalance: 100_000,
    })
    const category = await categoryRepo.create(CATEGORY)
    const kept = await transactionRepo.create({
      type: 'expense',
      amount: 1_500,
      description: 'поездка',
      occurredAt: '2026-08-10T10:00:00.000Z',
      accountId: account.id,
      categoryId: category.id,
    })
    const unborn = await transactionRepo.create({
      type: 'expense',
      amount: 500,
      description: 'ошибка',
      occurredAt: '2026-08-11T10:00:00.000Z',
      accountId: account.id,
      categoryId: category.id,
    })
    await transactionRepo.update(kept.id, { amount: 1_800, version: kept.version })
    await transactionRepo.remove(unborn.id)
    await accountRepo.update(account.id, { name: 'Карта+', version: account.version })

    const outcome = await main.engine.run({ force: true })
    expect(outcome.status).toBe('completed')

    // Queue drained; every record CLEAN.
    expect(main.db.select().from(syncOutbox).all()).toHaveLength(0)
    const categoryRow = main.db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, category.id))
      .get()
    expect(categoryRow).toMatchObject({ version: 1, serverVersion: 1 })

    // Server state matches the local outcome (REST verification).
    const { data: accounts } = await main.client.GET('/api/accounts')
    expect(accounts?.find((a) => a.id === account.id)?.name).toBe('Карта+')
    const { data: transactionsPage } = await main.client.GET('/api/transactions')
    const transactions = transactionsPage?.transactions ?? []
    expect(transactions.find((t) => t.id === kept.id)?.amount).toBe(1_800)
    expect(transactions.some((t) => t.id === unborn.id)).toBe(false)

    // A second device of the SAME user (fresh db + fresh session) converges
    // by pulling the full history from cursor 0 - same ids, same amounts.
    const second = await createDevice(loginAs(mainEmail), false)
    await second.engine.run({ force: true })
    const secondTransactions = await createLocalTransactionRepository(second.db).query({})
    expect(secondTransactions.map((t) => t.id)).toEqual([kept.id])
    expect(secondTransactions[0]?.amount).toBe(1_800)
    const secondAccounts = await createLocalAccountRepository(second.db).getAll()
    expect(secondAccounts.find((a) => a.id === account.id)?.name).toBe('Карта+')
    second.cleanup()
  })

  it('duplicate delivery of the same opId replays the stored result (no duplicate record)', async () => {
    const categoryRepo = createLocalCategoryRepository(main.db)
    const category = await categoryRepo.create({
      ...CATEGORY,
      name: `Дубликат ${randomUUID().slice(0, 8)}`,
    })
    await main.engine.run({ force: true })

    // Re-deliver the very same create operation (same opId) by hand.
    const [op] = main.db.select().from(syncOutbox).all()
    expect(op).toBeUndefined() // already confirmed and removed

    const duplicateOp: SyncPushOperation = {
      opId: randomUUID(),
      entity: 'category',
      action: 'upsert',
      id: category.id,
      baseVersion: 0,
      data: {
        name: `Дубликат ${randomUUID().slice(0, 8)}`,
        type: 'expense',
        icon: 'car',
        color: '#7c5cff',
      },
    }
    const first = await pushSyncOperations(main.client, [duplicateOp])
    expect(first[0]?.status).toBe('conflict') // different opId, existing record
    expect(first[0]?.code).toBe('SYNC_ALREADY_EXISTS')

    // The SAME opId delivered twice: stored result replayed, one record.
    const replayable: SyncPushOperation = {
      ...duplicateOp,
      data: {
        name: `Реплей ${randomUUID().slice(0, 8)}`,
        type: 'expense',
        icon: 'car',
        color: '#7c5cff',
      },
    }
    // First delivery creates a fresh record under a new id.
    const created: SyncPushOperation = {
      ...replayable,
      id: randomUUID(),
    }
    const appliedOnce = await pushSyncOperations(main.client, [created])
    expect(appliedOnce[0]?.status).toBe('applied')
    const appliedTwice = await pushSyncOperations(main.client, [created])
    expect(appliedTwice[0]?.status).toBe('applied')
    expect(appliedTwice[0]?.version).toBe(appliedOnce[0]?.version)

    const { data: categories } = await main.client.GET('/api/categories')
    expect(categories?.filter((c) => c.id === created.id)).toHaveLength(1)
  })

  it('delete-vs-edit: server tombstone wins by default, the edit stays recoverable', async () => {
    const categoryRepo = createLocalCategoryRepository(main.db)
    const category = await categoryRepo.create({
      ...CATEGORY,
      name: `Конфликт ${randomUUID().slice(0, 8)}`,
    })
    await main.engine.run({ force: true })

    // Another device deletes the category on the server (REST delete).
    const { response } = await main.client.DELETE('/api/categories/{id}', {
      params: { path: { id: category.id } },
    })
    expect(response.status).toBe(204)

    // Locally the user edits the (now remotely deleted) category.
    const row = main.db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, category.id))
      .get()
    await categoryRepo.update(category.id, { name: 'Локальная правка', version: row?.version ?? 1 })

    await main.engine.run({ force: true })

    // Delete-wins: tombstone applied locally, queue drained, conflict kept.
    const tombstoned = main.db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, category.id))
      .get()
    expect(tombstoned?.deletedAt).not.toBeNull()
    expect(main.db.select().from(syncOutbox).all()).toHaveLength(0)
    const conflicts = listUnresolvedConflicts(main.db)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].kind).toBe('deleted')
    expect((conflicts[0].localState as { name?: string }).name).toBe('Локальная правка')

    // Restore-as-new pushes the preserved edit under a new id.
    const restored = await categoryRepo.create({
      name: (conflicts[0].localState as { name: string }).name,
      type: 'expense',
      icon: 'car',
      color: '#7c5cff',
    })
    await main.engine.run({ force: true })
    const { data: serverCategories } = await main.client.GET('/api/categories')
    expect(
      serverCategories?.some((c) => c.id === restored.id && c.name === 'Локальная правка'),
    ).toBe(true)
  })

  it('restart with open conflicts: a new engine over the same file keeps them resolvable', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'et-sync-restart-'))
    try {
      // Device with a FILE-backed database signs in as a fresh user.
      const email = `sync-it-${randomUUID()}@example.com`
      const client = createApiClient({ baseUrl: API_URL, fetch: createCookieFetch() })
      await client.POST('/api/auth/register', { body: { email, password: 'test-password-123' } })

      const dbPath = join(dir, 'device.db')
      const db1 = await createTestDatabase(dbPath)
      const engine1 = createSyncEngine({
        db: db1,
        transport: createApiTransport(client),
        onDataChanged: () => undefined,
      })
      const categoryRepo = createLocalCategoryRepository(db1)
      const category = await categoryRepo.create({ ...CATEGORY, name: 'Перезагрузка' })
      await engine1.run({ force: true })

      // Remote edit + local edit -> version conflict, unresolved.
      const { data: server } = await client.GET('/api/categories/{id}', {
        params: { path: { id: category.id } },
      })
      await client.PATCH('/api/categories/{id}', {
        params: { path: { id: category.id } },
        body: { name: 'Серверная правка', version: server?.version ?? 1 },
      })
      const row = db1
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, category.id))
        .get()
      await categoryRepo.update(category.id, {
        name: 'Локальная правка',
        version: row?.version ?? 1,
      })
      await engine1.run({ force: true })
      expect(listUnresolvedConflicts(db1)).toHaveLength(1)

      // "Restart": a brand-new engine over the same file (the first handle
      // is left as-is, like an app process that died mid-conflict).
      const db2 = await createTestDatabase(dbPath)
      const engine2 = createSyncEngine({
        db: db2,
        transport: createApiTransport(client),
        onDataChanged: () => undefined,
      })
      const reopened = listUnresolvedConflicts(db2)
      expect(reopened).toHaveLength(1)

      resolveConflictTakeServer(db2, reopened[0].id)
      await engine2.run({ force: true })
      const finalRow = db2
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, category.id))
        .get()
      expect(finalRow?.name).toBe('Серверная правка')
      expect(finalRow).toMatchObject({ version: 2, serverVersion: 2 })
      expect(listUnresolvedConflicts(db2)).toHaveLength(0)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
