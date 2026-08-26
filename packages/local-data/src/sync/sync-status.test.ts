// The sync status snapshot feeds the badge count: resolved conflict rows are
// kept for history forever, so only unresolved ones may be counted.

import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDatabase } from '../testing/test-database'
import type { LocalDatabase } from '../types'
import { markConflictResolved, recordConflict } from './conflicts'
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
