// Engine cycle tests against an in-memory fake server that mirrors the
// backend's push semantics (opId idempotency/replay, CAS updates, delete
// idempotence, already-exists/ deleted/ version conflicts) and its cursor
// pull. Covers the spec scenarios: coalesced push + D5 realignment, chain
// continuation after an in-flight ancestor, duplicate delivery, partial
// batches, 401 pause/resume, CLEAN-only pull applies, pull-newer-on-dirty,
// delete-wins with restore-as-new, restart with open conflicts, backoff.

import { beforeEach, describe, expect, it } from '@jest/globals'
import {
  UnauthorizedError,
  type SyncPushOperation,
  type SyncPullPage,
  type SyncPushResultItem,
} from '@expense-tracker/api'
import { createLocalAccountRepository } from '@/entities/account/api/local-repository'
import { createLocalCategoryRepository } from '@/entities/category/api/local-repository'
import { createLocalTransactionRepository } from '@/entities/transaction/api/local-repository'
import { createTestDatabase } from '@/shared/lib/db/testing/test-database'
import type { LocalDatabase } from '@/shared/lib/db/database'
import { categories, syncOutbox } from '@/shared/lib/db/schema'
import { eq } from 'drizzle-orm'
import {
  listUnresolvedConflicts,
  markConflictResolved,
  resolveConflictKeepLocal,
  resolveConflictTakeServer,
} from './conflicts'
import {
  backoffDelayMs,
  createSyncEngine,
  type SyncEngine,
  type SyncTransport,
} from './sync-engine'
import { getPullCursor } from './sync-meta'
import { readSyncStatus } from './sync-status'

// --- Fake server -------------------------------------------------------------

interface ServerRecord {
  version: number
  deleted: boolean
  data: Record<string, unknown>
}

class FakeServer implements SyncTransport {
  records = new Map<string, ServerRecord>()
  appliedOps = new Map<string, number>()
  log: {
    seq: number
    entity: 'account' | 'category' | 'transaction'
    id: string
    action: 'upsert' | 'tombstone'
    version: number
    data?: Record<string, unknown>
  }[] = []
  pushCalls: SyncPushOperation[][] = []
  /** Apply the batch, then fail the response (lost-response simulation). */
  nextPushError: Error | null = null
  /** Reject the request before applying (auth/network failure simulation). */
  nextPushReject: Error | null = null
  /** Record keys whose next upsert returns a per-item error result. */
  failNextUpsertFor = new Set<string>()

  private key(entity: string, id: string) {
    return `${entity}:${id}`
  }

  append(
    entity: 'account' | 'category' | 'transaction',
    id: string,
    action: 'upsert' | 'tombstone',
    version: number,
    data?: Record<string, unknown>,
  ) {
    const seq = this.log.length + 1
    this.log.push({ seq, entity, id, action, version, ...(data ? { data } : {}) })
  }

  async push(operations: SyncPushOperation[]): Promise<SyncPushResultItem[]> {
    this.pushCalls.push(operations)
    if (this.nextPushReject) {
      const error = this.nextPushReject
      this.nextPushReject = null
      throw error
    }
    // Apply first, then optionally fail: simulates "applied server-side but
    // the response was lost".
    const results = operations.map((op) => this.apply(op))
    if (this.nextPushError) {
      const error = this.nextPushError
      this.nextPushError = null
      throw error
    }
    return results
  }

  apply(op: SyncPushOperation): SyncPushResultItem {
    const replayed = this.appliedOps.get(op.opId)
    if (replayed !== undefined) {
      return { opId: op.opId, status: 'applied', version: replayed }
    }

    const k = this.key(op.entity, op.id)

    if (op.action === 'delete') {
      const rec = this.records.get(k)
      if (!rec) return { opId: op.opId, status: 'applied', version: 0 }
      if (rec.deleted) return { opId: op.opId, status: 'applied', version: rec.version }
      rec.deleted = true
      rec.version += 1
      this.append(op.entity, op.id, 'tombstone', rec.version)
      this.appliedOps.set(op.opId, rec.version)
      return { opId: op.opId, status: 'applied', version: rec.version }
    }

    const data = (op.data ?? {}) as Record<string, unknown>

    if (op.baseVersion === 0) {
      const existing = this.records.get(k)
      if (existing) {
        return {
          opId: op.opId,
          status: 'conflict',
          code: 'SYNC_ALREADY_EXISTS',
          message: 'record already exists',
          serverState: {
            version: existing.version,
            deleted: existing.deleted,
            ...(existing.deleted ? {} : { data: existing.data as never }),
          },
        }
      }
      if (this.failNextUpsertFor.has(k)) {
        this.failNextUpsertFor.delete(k)
        return {
          opId: op.opId,
          status: 'error',
          code: 'CATEGORY_ALREADY_EXISTS',
          message: 'name taken',
        }
      }
      this.records.set(k, { version: 1, deleted: false, data })
      this.append(op.entity, op.id, 'upsert', 1, data)
      this.appliedOps.set(op.opId, 1)
      return { opId: op.opId, status: 'applied', version: 1 }
    }

    const rec = this.records.get(k)
    if (!rec) {
      return {
        opId: op.opId,
        status: 'conflict',
        code: 'SYNC_VERSION_CONFLICT',
        message: 'not found on server',
        serverState: { version: 0, deleted: false },
      }
    }
    if (rec.deleted) {
      return {
        opId: op.opId,
        status: 'conflict',
        code: 'SYNC_DELETED_CONFLICT',
        message: 'deleted on server',
        serverState: { version: rec.version, deleted: true },
      }
    }
    if (rec.version !== op.baseVersion) {
      return {
        opId: op.opId,
        status: 'conflict',
        code: 'SYNC_VERSION_CONFLICT',
        message: 'version conflict',
        serverState: { version: rec.version, deleted: false, data: rec.data as never },
      }
    }
    rec.version += 1
    rec.data = data
    this.append(op.entity, op.id, 'upsert', rec.version, data)
    this.appliedOps.set(op.opId, rec.version)
    return { opId: op.opId, status: 'applied', version: rec.version }
  }

  async pull(cursor: number): Promise<SyncPullPage> {
    return {
      changes: this.log.filter((c) => c.seq > cursor) as SyncPullPage['changes'],
      nextCursor: null,
    }
  }

  /** Server-side mutation by "another device". */
  mutate(
    entity: 'account' | 'category' | 'transaction',
    id: string,
    patch: Record<string, unknown>,
  ) {
    const k = this.key(entity, id)
    const rec = this.records.get(k)
    if (!rec) throw new Error('mutate: unknown record')
    rec.data = { ...rec.data, ...patch }
    rec.version += 1
    this.append(entity, id, 'upsert', rec.version, rec.data)
  }

  deleteRecord(entity: 'account' | 'category' | 'transaction', id: string) {
    const k = this.key(entity, id)
    const rec = this.records.get(k)
    if (!rec) throw new Error('deleteRecord: unknown record')
    rec.deleted = true
    rec.version += 1
    this.append(entity, id, 'tombstone', rec.version)
  }
}

// --- Harness -------------------------------------------------------------------

let db: LocalDatabase
let server: FakeServer
let clockMs: number
let engine: SyncEngine
let categoryRepo: ReturnType<typeof createLocalCategoryRepository>
let accountRepo: ReturnType<typeof createLocalAccountRepository>
let transactionRepo: ReturnType<typeof createLocalTransactionRepository>

function makeEngine(transport: SyncTransport = server) {
  return createSyncEngine({
    db,
    transport,
    now: () => new Date(clockMs),
    onDataChanged: () => undefined,
  })
}

function categoryRow(id: string) {
  return db.select().from(categories).where(eq(categories.id, id)).get()
}

function outboxRows() {
  return db.select().from(syncOutbox).all()
}

beforeEach(async () => {
  db = await createTestDatabase()
  server = new FakeServer()
  clockMs = Date.parse('2026-08-16T12:00:00.000Z')
  engine = makeEngine()
  categoryRepo = createLocalCategoryRepository(db)
  accountRepo = createLocalAccountRepository(db)
  transactionRepo = createLocalTransactionRepository(db)
})

const CATEGORY = { name: 'Такси', type: 'expense' as const, icon: 'car', color: '#7c5cff' }

// --- Push: coalescing + D5 ------------------------------------------------------

describe('sync engine: push phase', () => {
  it('coalesces three offline edits into one operation and realigns CLEAN (D5)', async () => {
    const category = await categoryRepo.create(CATEGORY)
    await categoryRepo.update(category.id, { name: 'Такси 2', version: category.version })
    await categoryRepo.update(category.id, { name: 'Такси 3', version: 2 })
    // 3 mutations -> local version 3, serverVersion 0.
    expect(categoryRow(category.id)).toMatchObject({ version: 3, serverVersion: 0 })
    expect(outboxRows()).toHaveLength(3)

    const outcome = await engine.run({ force: true })

    expect(outcome.pushed).toBe(1)
    expect(server.pushCalls).toHaveLength(1)
    expect(server.pushCalls[0]).toHaveLength(1) // coalesced to ONE operation
    expect(server.records.get(`category:${category.id}`)?.data).toMatchObject({ name: 'Такси 3' })

    // Coalesced realignment: one server op (v1) closes the invariant.
    expect(categoryRow(category.id)).toMatchObject({ version: 1, serverVersion: 1 })
    expect(outboxRows()).toHaveLength(0)
    expect(getPullCursor(db)).toBeGreaterThan(0)
  })

  it('pushes unborn create+delete as nothing', async () => {
    const category = await categoryRepo.create(CATEGORY)
    await categoryRepo.remove(category.id)
    expect(outboxRows()).toHaveLength(0)

    await engine.run({ force: true })
    expect(server.pushCalls).toHaveLength(0)
    expect(server.records.size).toBe(0)
  })

  it('continues the chain after an in-flight ancestor confirms (follower re-bases)', async () => {
    // A gated transport lets the test mutate locally while the first push is
    // in flight - the spec's "edit during in-flight push" scenario. Follower
    // pushes resolve immediately (the engine continues the chain in-run).
    const gate: { release: (() => void) | null } = { release: null }
    let firstPush = true
    const gatedTransport: SyncTransport = {
      push: (operations) =>
        new Promise((resolve) => {
          server.pushCalls.push(operations)
          const results = operations.map((op) => server.apply(op))
          if (firstPush) {
            firstPush = false
            gate.release = () => resolve(results)
          } else {
            resolve(results)
          }
        }),
      pull: (cursor) => server.pull(cursor),
    }
    const gatedEngine = makeEngine(gatedTransport)

    const category = await categoryRepo.create(CATEGORY) // operation A
    const runPromise = gatedEngine.run({ force: true })
    await new Promise((resolve) => setImmediate(resolve))
    expect(gate.release).not.toBeNull()

    const afterA = await categoryRepo.update(category.id, {
      name: 'Такси 2',
      version: category.version,
    }) // operation B, created while A is in flight
    expect(afterA.version).toBe(2)
    const followerOpId = db.select().from(syncOutbox).all().at(-1)?.opId

    gate.release?.()
    await runPromise

    // A confirmed (server v1); B pushed as a continuation against v1 and
    // applied (server v2) - record CLEAN at 2, queue empty.
    expect(server.pushCalls).toHaveLength(2)
    const followerCall = server.pushCalls[1][0]
    expect(followerCall.opId).toBe(followerOpId)
    expect(followerCall.baseVersion).toBe(1)
    expect(categoryRow(category.id)).toMatchObject({ version: 2, serverVersion: 2 })
    expect(outboxRows()).toHaveLength(0)
  })

  it('replays stored results on duplicate delivery after a lost response', async () => {
    const category = await categoryRepo.create(CATEGORY)

    // The server applies the push but the response is lost (network drop).
    server.nextPushError = new Error('network dropped after apply')
    await engine.run({ force: true })
    expect(server.appliedOps.size).toBe(1)
    expect(categoryRow(category.id)?.serverVersion).toBe(0) // unconfirmed locally
    expect(outboxRows()).toHaveLength(1)

    // Retry delivers the SAME opId: the server replays, no duplicate record.
    const outcome = await engine.run({ force: true })
    expect(outcome.pushed).toBe(1)
    expect(server.records.size).toBe(1)
    expect(server.appliedOps.size).toBe(1)
    expect(categoryRow(category.id)).toMatchObject({ version: 1, serverVersion: 1 })
    expect(outboxRows()).toHaveLength(0)
  })

  it('keeps error-result operations queued with the machine code (partial batch)', async () => {
    const ok = await categoryRepo.create(CATEGORY)
    const failing = await categoryRepo.create({ ...CATEGORY, name: 'Доставка' })
    server.failNextUpsertFor.add(`category:${failing.id}`)

    const outcome = await engine.run()

    expect(outcome.pushed).toBe(1)
    expect(categoryRow(ok.id)).toMatchObject({ version: 1, serverVersion: 1 })
    const kept = outboxRows()
    expect(kept).toHaveLength(1)
    expect(kept[0].entityId).toBe(failing.id)
    expect(kept[0].lastError).toContain('CATEGORY_ALREADY_EXISTS')
    expect(kept[0].attempts).toBe(1)
  })

  it('backs off failed operations and re-sends after the window (force bypasses)', async () => {
    const failing = await categoryRepo.create(CATEGORY)
    server.failNextUpsertFor.add(`category:${failing.id}`)
    await engine.run({ force: true })
    expect(outboxRows()[0].attempts).toBe(1)

    // Immediate non-forced run: the op is inside its backoff window.
    await engine.run()
    expect(server.pushCalls).toHaveLength(1)

    // After the window (5s base backoff) it goes out again.
    clockMs += backoffDelayMs(1) + 1
    await engine.run()
    expect(server.pushCalls).toHaveLength(2)
  })

  it('pauses on 401 mid-run and resumes after re-login without queue loss', async () => {
    const category = await categoryRepo.create(CATEGORY)
    server.nextPushReject = new UnauthorizedError('session expired')

    const outcome = await engine.run({ force: true })
    expect(outcome.status).toBe('paused')
    expect(engine.getState().paused).toBe(true)
    expect(outboxRows()).toHaveLength(1) // queue untouched

    // Triggers are no-ops while paused: no further push left the device and
    // nothing was applied.
    await engine.run({ force: true })
    expect(server.pushCalls).toHaveLength(1)
    expect(server.appliedOps.size).toBe(0)

    engine.resume()
    const resumed = await engine.run({ force: true })
    expect(resumed.status).toBe('completed')
    expect(categoryRow(category.id)).toMatchObject({ version: 1, serverVersion: 1 })
  })
})

// --- Pull ------------------------------------------------------------------------

describe('sync engine: pull phase', () => {
  it('applies pulled changes to CLEAN records and advances the cursor once', async () => {
    const category = await categoryRepo.create(CATEGORY)
    await engine.run({ force: true })
    const cursorAfterPush = getPullCursor(db)

    server.mutate('category', category.id, { name: 'Такси (переименован на сервере)' })
    const outcome = await engine.run({ force: true })

    expect(outcome.pulled).toBe(1)
    const row = categoryRow(category.id)
    expect(row).toMatchObject({ version: 2, serverVersion: 2, deletedAt: null })
    const pulled = await categoryRepo.getById(category.id)
    expect(pulled?.name).toBe('Такси (переименован на сервере)')

    // Caught up: a further run pulls nothing new and keeps the cursor.
    const again = await engine.run({ force: true })
    expect(again.pulled).toBe(0)
    expect(getPullCursor(db)).toBeGreaterThan(cursorAfterPush)
  })

  it('never overwrites a DIRTY record: pull-newer-on-dirty creates a persistent conflict', async () => {
    const category = await categoryRepo.create(CATEGORY)
    await engine.run({ force: true })

    await categoryRepo.update(category.id, { name: 'Локальное имя', version: 1 })
    server.mutate('category', category.id, { name: 'Серверное имя' })

    await engine.run({ force: true })

    // The push conflicted first (base 1 vs server 2) - same persistent record.
    const conflicts = listUnresolvedConflicts(db)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toMatchObject({
      entity: 'category',
      entityId: category.id,
      kind: 'version',
    })
    expect((conflicts[0].localState as { name?: string }).name).toBe('Локальное имя')
    expect((conflicts[0].serverState?.data as { name?: string } | undefined)?.name).toBe(
      'Серверное имя',
    )

    // Local state untouched, op retained.
    expect(await categoryRepo.getById(category.id)).toMatchObject({ name: 'Локальное имя' })
    expect(outboxRows()).toHaveLength(1)
  })

  it('take-theirs applies the server state, drops pending operations, goes CLEAN', async () => {
    const category = await categoryRepo.create(CATEGORY)
    await engine.run({ force: true })
    await categoryRepo.update(category.id, { name: 'Локальное имя', version: 1 })
    server.mutate('category', category.id, { name: 'Серверное имя' })
    await engine.run({ force: true })

    const [conflict] = listUnresolvedConflicts(db)
    resolveConflictTakeServer(db, conflict.id)

    expect(await categoryRepo.getById(category.id)).toMatchObject({ name: 'Серверное имя' })
    expect(categoryRow(category.id)).toMatchObject({ version: 2, serverVersion: 2 })
    expect(outboxRows()).toHaveLength(0)
    expect(listUnresolvedConflicts(db)).toHaveLength(0)
  })

  it('keep-mine rebases onto the server version and re-pushes to CLEAN', async () => {
    const category = await categoryRepo.create(CATEGORY)
    await engine.run({ force: true })
    await categoryRepo.update(category.id, { name: 'Локальное имя', version: 1 })
    server.mutate('category', category.id, { name: 'Серверное имя' })
    await engine.run({ force: true })

    const [conflict] = listUnresolvedConflicts(db)
    resolveConflictKeepLocal(db, conflict.id)

    expect(await categoryRepo.getById(category.id)).toMatchObject({ name: 'Локальное имя' })
    expect(outboxRows()).toHaveLength(1)
    expect(outboxRows()[0].baseVersion).toBe(2)

    const outcome = await engine.run({ force: true })
    expect(outcome.pushed).toBe(1)
    expect(categoryRow(category.id)).toMatchObject({ version: 3, serverVersion: 3 })
    expect(server.records.get(`category:${category.id}`)?.data).toMatchObject({
      name: 'Локальное имя',
    })
  })

  it('delete-vs-edit on push applies delete-wins and preserves the edit for restore', async () => {
    const category = await categoryRepo.create(CATEGORY)
    await engine.run({ force: true })
    await categoryRepo.update(category.id, { name: 'Локальная правка', version: 1 })
    server.deleteRecord('category', category.id)

    await engine.run({ force: true })

    // Tombstone applied locally by default; ops dropped; conflict kept.
    expect(categoryRow(category.id)?.deletedAt).not.toBeNull()
    expect(outboxRows()).toHaveLength(0)
    const [conflict] = listUnresolvedConflicts(db)
    expect(conflict.kind).toBe('deleted')
    expect((conflict.localState as { name: string }).name).toBe('Локальная правка')

    // Restore-as-new: the preserved edit comes back under a new id.
    const restored = await categoryRepo.create({
      name: (conflict.localState as { name: string }).name,
      type: 'expense',
      icon: 'car',
      color: '#7c5cff',
    })
    markConflictResolved(db, conflict.id)
    await engine.run({ force: true })
    expect(restored.id).not.toBe(category.id)
    expect(await categoryRepo.getById(restored.id)).toMatchObject({ name: 'Локальная правка' })
    expect(server.records.get(`category:${restored.id}`)).toBeDefined()
    expect(listUnresolvedConflicts(db)).toHaveLength(0)
  })

  it('a pulled tombstone on a DIRTY record applies delete-wins too', async () => {
    const category = await categoryRepo.create(CATEGORY)
    await engine.run({ force: true })
    await categoryRepo.update(category.id, { name: 'Локальная правка', version: 1 })
    server.deleteRecord('category', category.id)

    // Push that goes nowhere (e.g. the edit op keeps erroring), pull delivers
    // the tombstone while the record is dirty.
    const pullOnlyTransport: SyncTransport = {
      push: async () => [],
      pull: (cursor) => server.pull(cursor),
    }
    await makeEngine(pullOnlyTransport).run({ force: true })

    expect(categoryRow(category.id)?.deletedAt).not.toBeNull()
    expect(outboxRows()).toHaveLength(0)
    expect(listUnresolvedConflicts(db)).toHaveLength(1)
    expect(listUnresolvedConflicts(db)[0].kind).toBe('deleted')
  })

  it('a pulled tombstone on a CLEAN record just applies', async () => {
    const category = await categoryRepo.create(CATEGORY)
    await engine.run({ force: true })
    server.deleteRecord('category', category.id)

    await engine.run({ force: true })

    expect(categoryRow(category.id)?.deletedAt).not.toBeNull()
    expect(listUnresolvedConflicts(db)).toHaveLength(0)
  })
})

// --- Cycle + status -------------------------------------------------------------

describe('sync engine: cycle and restart', () => {
  it('pushes before pulling and merges initial sync by id (union)', async () => {
    // Local-only record.
    const localCategory = await categoryRepo.create(CATEGORY)
    // Server-only record (created by "the web app").
    const serverCategoryId = '11111111-1111-4111-8111-111111111111'
    server.records.set(`category:${serverCategoryId}`, {
      version: 1,
      deleted: false,
      data: { name: 'Продукты', type: 'expense', icon: 'cart', color: '#16a34a' },
    })
    server.append('category', serverCategoryId, 'upsert', 1, {
      name: 'Продукты',
      type: 'expense',
      icon: 'cart',
      color: '#16a34a',
    })

    const outcome = await engine.run({ force: true })

    expect(outcome.pushed).toBeGreaterThanOrEqual(1)
    const names = new Set((await categoryRepo.getAll()).map((c) => c.name))
    expect(names).toEqual(new Set(['Такси', 'Продукты']))
    expect(categoryRow(localCategory.id)?.serverVersion).toBe(1)
    expect(readSyncStatus(db).unresolvedConflicts).toBe(0)
  })

  it('survives a restart with open conflicts (new engine, same state)', async () => {
    const category = await categoryRepo.create(CATEGORY)
    await engine.run({ force: true })
    await categoryRepo.update(category.id, { name: 'Локальное имя', version: 1 })
    server.mutate('category', category.id, { name: 'Серверное имя' })
    await engine.run({ force: true })
    expect(listUnresolvedConflicts(db)).toHaveLength(1)

    // "Restart": a fresh engine instance over the same database.
    const pushCallsBefore = server.pushCalls.length
    const restarted = makeEngine()
    await restarted.run({ force: true })

    expect(listUnresolvedConflicts(db)).toHaveLength(1)
    expect(await categoryRepo.getById(category.id)).toMatchObject({ name: 'Локальное имя' })
    // The conflicted record's op is blocked while unresolved: nothing re-pushed.
    expect(server.pushCalls).toHaveLength(pushCallsBefore)
  })

  it('converges offline create/edit/delete flows to the same server state', async () => {
    const account = await accountRepo.create({
      name: 'Карта',
      currency: 'RUB',
      openingBalance: 100_000,
    })
    const category = await categoryRepo.create(CATEGORY)
    const kept = await transactionRepo.create({
      type: 'expense',
      amount: 1_500,
      description: '',
      occurredAt: '2026-08-10T10:00:00.000Z',
      accountId: account.id,
      categoryId: category.id,
    })
    const doomed = await transactionRepo.create({
      type: 'expense',
      amount: 2_500,
      description: '',
      occurredAt: '2026-08-11T10:00:00.000Z',
      accountId: account.id,
      categoryId: category.id,
    })
    await transactionRepo.update(kept.id, { amount: 1_800, version: kept.version })
    await transactionRepo.remove(doomed.id)
    await accountRepo.update(account.id, { name: 'Карта+', version: account.version })

    await engine.run({ force: true })

    expect(outboxRows()).toHaveLength(0)
    const accountRecord = server.records.get(`account:${account.id}`)
    expect(accountRecord?.data).toMatchObject({ name: 'Карта+' })
    expect(server.records.get(`transaction:${kept.id}`)?.data).toMatchObject({ amount: 1_800 })
    // Unborn create+delete (never synced): no trace on the server at all.
    expect(server.records.has(`transaction:${doomed.id}`)).toBe(false)
    // Every pushed record ended CLEAN.
    expect(db.select().from(categories).where(eq(categories.id, category.id)).get()).toMatchObject({
      version: 1,
      serverVersion: 1,
    })

    // A second device (fresh database) converges by pulling from cursor 0:
    // the same final transaction list, same amount.
    const secondDb = await createTestDatabase()
    const secondEngine = createSyncEngine({
      db: secondDb,
      transport: server,
      now: () => new Date(clockMs),
      onDataChanged: () => undefined,
    })
    await secondEngine.run({ force: true })
    const secondRepo = createLocalTransactionRepository(secondDb)
    const pulled = await secondRepo.query({})
    expect(pulled.map((t) => t.id)).toEqual([kept.id])
    expect(pulled[0]?.amount).toBe(1_800)

    // A delete AFTER the record is server-known pushes a real tombstone, and
    // the second device learns of it via pull.
    await transactionRepo.remove(kept.id)
    await engine.run({ force: true })
    expect(server.records.get(`transaction:${kept.id}`)?.deleted).toBe(true)
    await secondEngine.run({ force: true })
    expect(await secondRepo.query({})).toEqual([])
  })
})

describe('backoffDelayMs', () => {
  it('grows exponentially and caps at 15 minutes', () => {
    expect(backoffDelayMs(1)).toBe(5_000)
    expect(backoffDelayMs(2)).toBe(10_000)
    expect(backoffDelayMs(3)).toBe(20_000)
    expect(backoffDelayMs(20)).toBe(15 * 60_000)
  })
})
