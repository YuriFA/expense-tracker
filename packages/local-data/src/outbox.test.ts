// Version/dirty-state transitions (design D5) and outbox mechanics (D6)
// exercised end-to-end through a real SQLite transaction: the category
// repository supplies the mutations, `applyPushConfirmations` /
// `coalesceUnsentOperations` supply the (future) sync engine's transitions.

import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createLocalCategoryRepository } from './repositories/category'
import { createTestDatabase } from './testing/test-database'
import {
  applyPushConfirmations,
  coalesceUnsentOperations,
  pendingOperations,
  type PushConfirmation,
} from './outbox'
import { categories, syncOutbox, type SyncEntity } from './schema'
import type { LocalDatabase } from './types'

const PAYLOAD = { name: 'Такси', type: 'expense' as const, icon: 'car', color: '#7c5cff' }

/** Direct row access - the sync engine's readRecord callback equivalent. */
function readCategory(db: LocalDatabase) {
  return (entity: SyncEntity, entityId: string) => {
    expect(entity).toBe('category')
    const row = db.select().from(categories).where(eq(categories.id, entityId)).get()
    if (!row) return null
    return {
      deleted: row.deletedAt !== null,
      payload: { id: row.id, name: row.name, type: row.type, icon: row.icon, color: row.color },
    }
  }
}

/** Rename through the public API: reads the current version (CAS token) the
 * way a real caller does, then updates - keeps the outbox tests focused on
 * the queue mechanics rather than the update payload shape. */
async function rename(
  repo: ReturnType<typeof createLocalCategoryRepository>,
  id: string,
  name: string,
) {
  const current = await repo.getById(id)
  return repo.update(id, { name, version: current?.version ?? 0 })
}

function confirm(db: LocalDatabase, confirmations: readonly PushConfirmation[]) {
  db.transaction((tx) => applyPushConfirmations(tx, confirmations))
}

function markSent(db: LocalDatabase, opId: string) {
  db.update(syncOutbox)
    .set({ sentAt: new Date().toISOString() })
    .where(eq(syncOutbox.opId, opId))
    .run()
}

function categoryRow(db: LocalDatabase, id: string) {
  return db.transaction((tx) => tx.select().from(categories).where(eq(categories.id, id)).get())
}

/** Seeds a record as fully synchronized at server revision 5 (local ==
 * server == 5, empty queue) - as if its create had been pushed and
 * confirmed long ago. */
function seedConfirmedAt5(db: LocalDatabase, id: string) {
  db.update(categories).set({ version: 5, serverVersion: 5 }).where(eq(categories.id, id)).run()
  db.delete(syncOutbox).run()
}

let db: LocalDatabase

beforeEach(async () => {
  db = await createTestDatabase()
})

describe('outbox: pending operation per mutation', () => {
  it('creates exactly one operation per mutation with baseVersion = serverVersion', async () => {
    const repo = createLocalCategoryRepository(db)
    const category = await repo.create(PAYLOAD)
    await rename(repo, category.id, 'Такси 2')
    await rename(repo, category.id, 'Такси 3')

    const ops = db.transaction((tx) => pendingOperations(tx))
    expect(ops).toHaveLength(3)
    expect(ops.every((op) => op.entity === 'category' && op.entityId === category.id)).toBe(true)
    // serverVersion stayed 0 -> every operation carries base revision 0.
    expect(ops.every((op) => op.baseVersion === 0)).toBe(true)
  })

  it('mutation bumps only the local revision; the record stays DIRTY', async () => {
    const repo = createLocalCategoryRepository(db)
    const category = await repo.create(PAYLOAD)
    seedConfirmedAt5(db, category.id)
    await rename(repo, category.id, 'Такси 2')
    await rename(repo, category.id, 'Такси 3')

    const row = categoryRow(db, category.id)
    expect(row?.version).toBe(7)
    expect(row?.serverVersion).toBe(5)
  })
})

describe('outbox: base revision is captured at creation', () => {
  it('an operation created at server revision 5 keeps base 5 after later edits', async () => {
    const repo = createLocalCategoryRepository(db)
    const category = await repo.create(PAYLOAD)
    seedConfirmedAt5(db, category.id)

    await rename(repo, category.id, 'Такси 2') // operation A, base 5
    await rename(repo, category.id, 'Такси 3') // raises local to 7
    await rename(repo, category.id, 'Такси 4')

    const ops = db.transaction((tx) => pendingOperations(tx))
    expect(ops).toHaveLength(3)
    expect(ops.every((op) => op.baseVersion === 5)).toBe(true)
  })
})

describe('outbox: confirmations (design D5)', () => {
  it('edit during in-flight push: only A is removed, B stays pending, record stays DIRTY', async () => {
    const repo = createLocalCategoryRepository(db)
    const category = await repo.create(PAYLOAD)
    seedConfirmedAt5(db, category.id)

    await rename(repo, category.id, 'Такси 2') // operation A (base 5)
    const [operationA] = db.transaction((tx) => pendingOperations(tx))
    markSent(db, operationA.opId) // engine froze A for the in-flight request

    await rename(repo, category.id, 'Такси 3') // operation B (base 5)
    expect(db.transaction((tx) => pendingOperations(tx))).toHaveLength(2)

    confirm(db, [{ opId: operationA.opId, version: 6 }])

    const row = categoryRow(db, category.id)
    expect(row?.serverVersion).toBe(6)
    expect(row?.version).toBe(7) // untouched: B is still pending
    const remaining = db.transaction((tx) => pendingOperations(tx))
    expect(remaining).toHaveLength(1)
    expect(remaining[0].baseVersion).toBe(5) // not rebased onto 6
  })

  it('last confirmation aligns the local revision (sequential case converges)', async () => {
    const repo = createLocalCategoryRepository(db)
    const category = await repo.create(PAYLOAD)
    seedConfirmedAt5(db, category.id)

    await rename(repo, category.id, 'Такси 2')
    const [operation] = db.transaction((tx) => pendingOperations(tx))

    confirm(db, [{ opId: operation.opId, version: 6 }])

    const row = categoryRow(db, category.id)
    expect(row?.serverVersion).toBe(6)
    expect(row?.version).toBe(6) // CLEAN
    expect(db.transaction((tx) => pendingOperations(tx))).toHaveLength(0)
  })

  it('coalesced group realigns: 3 edits at local 8 confirmed as one op at server 6 end CLEAN at 6', async () => {
    const repo = createLocalCategoryRepository(db)
    const category = await repo.create(PAYLOAD)
    seedConfirmedAt5(db, category.id)

    await rename(repo, category.id, 'Такси 2')
    await rename(repo, category.id, 'Такси 3')
    await rename(repo, category.id, 'Такси 4')
    expect(categoryRow(db, category.id)?.version).toBe(8)

    // The three unsent operations coalesce into one: first opId, first base,
    // full current state.
    db.transaction((tx) => coalesceUnsentOperations(tx, readCategory(db)))
    const coalesced = db.transaction((tx) => pendingOperations(tx))
    expect(coalesced).toHaveLength(1)
    expect(coalesced[0].baseVersion).toBe(5)
    expect(JSON.parse(coalesced[0].payloadJson)).toMatchObject({ name: 'Такси 4' })

    confirm(db, [{ opId: coalesced[0].opId, version: 6 }])

    const row = categoryRow(db, category.id)
    expect(row?.version).toBe(6)
    expect(row?.serverVersion).toBe(6) // CLEAN, not left dirty at 8
    expect(db.transaction((tx) => pendingOperations(tx))).toHaveLength(0)
  })
})

describe('outbox: unborn records', () => {
  it('create then delete before any confirmation leaves no operation', async () => {
    const repo = createLocalCategoryRepository(db)
    const category = await repo.create(PAYLOAD)
    expect(db.transaction((tx) => pendingOperations(tx))).toHaveLength(1)

    await repo.remove(category.id)

    expect(await repo.getAll()).toHaveLength(0)
    expect(db.transaction((tx) => pendingOperations(tx))).toHaveLength(0)
    expect(categoryRow(db, category.id)).toBeUndefined()
  })

  it('delete while the create is in flight keeps both operations (tombstone flow)', async () => {
    const repo = createLocalCategoryRepository(db)
    const category = await repo.create(PAYLOAD)
    const [createOp] = db.transaction((tx) => pendingOperations(tx))
    markSent(db, createOp.opId) // in flight: the server may already hold the create

    await repo.remove(category.id)

    // The record is tombstoned, not vanished: the frozen create stays
    // retryable under its opId, and the delete travels after it.
    const row = categoryRow(db, category.id)
    expect(row?.deletedAt).not.toBeNull()
    expect(row?.version).toBe(2)
    const ops = db.transaction((tx) => pendingOperations(tx))
    expect(ops).toHaveLength(2)
    // Same-millisecond createdAt falls back to opId order, so identify the
    // operations by kind instead of index.
    const createAfterDelete = ops.find((o) => o.opId === createOp.opId)
    const deleteOp = ops.find((o) => o.op === 'delete')
    expect(createAfterDelete?.sentAt).not.toBeNull()
    expect(deleteOp).toMatchObject({ entityId: category.id, baseVersion: 0 })
  })
})
