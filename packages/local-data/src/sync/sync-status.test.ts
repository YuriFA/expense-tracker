// The sync status snapshot feeds the badge count: resolved conflict rows are
// kept for history forever, so only unresolved ones may be counted; failing
// operations (lastError standing on the row) are a distinct subset of the
// pending outbox.

import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDatabase } from '../testing/test-database'
import type { LocalDatabase } from '../types'
import { syncOutbox } from '../schema'
import { markConflictResolved, recordConflict } from './conflicts'
import { enqueueOperation } from '../outbox'
import { readSyncStatus } from './sync-status'

let db: LocalDatabase

beforeEach(async () => {
  db = await createTestDatabase()
})

function recordVersionConflict(entityId: string) {
  return db.transaction((tx) =>
    recordConflict(tx, {
      entity: 'category',
      entityId,
      opId: null,
      kind: 'version',
      baseVersion: 1,
      serverVersion: 2,
      localState: null,
      serverState: { version: 2, deleted: false },
    }),
  )
}

describe('readSyncStatus', () => {
  it('unresolved conflicts are counted, resolved ones are not', () => {
    const first = recordVersionConflict('cat-1')
    const second = recordVersionConflict('cat-2')
    expect(readSyncStatus(db).unresolvedConflicts).toBe(2)

    markConflictResolved(db, first.id)
    expect(readSyncStatus(db).unresolvedConflicts).toBe(1)

    markConflictResolved(db, second.id)
    expect(readSyncStatus(db).unresolvedConflicts).toBe(0)
  })
})

describe('readSyncStatus failing operations', () => {
  function enqueue(entityId: string, lastError: string | null, createdAt: string) {
    const opId = db.transaction((tx) =>
      enqueueOperation(tx, {
        entity: 'category',
        entityId,
        op: 'upsert',
        payload: { name: entityId },
        baseVersion: 0,
      }),
    )
    db.update(syncOutbox).set({ lastError, createdAt }).where(eq(syncOutbox.opId, opId)).run()
  }

  it('an empty outbox reports zero failing and no last error', () => {
    const snapshot = readSyncStatus(db)
    expect(snapshot.pendingOperations).toBe(0)
    expect(snapshot.failingOperations).toBe(0)
    expect(snapshot.lastError).toBeNull()
  })

  it('healthy queued operations are pending but not failing', () => {
    enqueue('cat-1', null, '2026-01-01T00:00:00Z')
    const snapshot = readSyncStatus(db)
    expect(snapshot.pendingOperations).toBe(1)
    expect(snapshot.failingOperations).toBe(0)
    expect(snapshot.lastError).toBeNull()
  })

  it('failing operations are counted and the newest error is sampled', () => {
    enqueue('cat-1', 'INVALID_REFS: invalid references', '2026-01-01T00:00:00Z')
    enqueue('cat-2', null, '2026-01-02T00:00:00Z')
    enqueue('cat-3', 'CATEGORY_ALREADY_EXISTS: category name already exists', '2026-01-03T00:00:00Z')

    const snapshot = readSyncStatus(db)
    expect(snapshot.pendingOperations).toBe(3)
    expect(snapshot.failingOperations).toBe(2)
    // The newest failing row wins, regardless of newer healthy ops.
    expect(snapshot.lastError).toBe(
      'CATEGORY_ALREADY_EXISTS: category name already exists',
    )
  })
})

