// Sync status snapshot for the UI: pending outbox size, unresolved conflicts,
// last successful run. Read as a TanStack Query (key ['sync','status']),
// invalidated by the engine after every run.

import { count, isNull } from 'drizzle-orm'
import type { LocalDatabase } from '@/shared/lib/db/database'
import { syncConflicts, syncOutbox } from '@/shared/lib/db/schema'
import { LAST_SYNCED_AT_KEY, getMetaValue } from './sync-meta'

export interface SyncStatusSnapshot {
  pendingOperations: number
  unresolvedConflicts: number
  lastSyncedAt: string | null
}

export function readSyncStatus(db: LocalDatabase): SyncStatusSnapshot {
  const pending = db.select({ value: count() }).from(syncOutbox).get()
  // Resolved conflict rows are kept for history - only unresolved ones count.
  const conflicts = db
    .select({ value: count() })
    .from(syncConflicts)
    .where(isNull(syncConflicts.resolvedAt))
    .get()
  return {
    pendingOperations: pending?.value ?? 0,
    unresolvedConflicts: conflicts?.value ?? 0,
    lastSyncedAt: getMetaValue(db, LAST_SYNCED_AT_KEY),
  }
}
