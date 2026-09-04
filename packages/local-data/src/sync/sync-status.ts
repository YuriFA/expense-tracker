// Sync status snapshot for the UI: pending outbox size, unresolved conflicts,
// last successful run. Read as a TanStack Query (key ['sync','status']),
// invalidated by the engine after every run.

import { count, desc, isNotNull, isNull } from 'drizzle-orm'
import type { LocalDatabase } from '../types'
import { syncConflicts, syncOutbox } from '../schema'
import { LAST_SYNCED_AT_KEY, getMetaValue } from './sync-meta'

export interface SyncStatusSnapshot {
  pendingOperations: number
  unresolvedConflicts: number
  lastSyncedAt: string | null
  /** Queued operations whose last attempt failed (server per-item error or
   * local wire validation) - stuck without user action, unlike plain
   * pending. A subset of `pendingOperations`. */
  failingOperations: number
  /** The stored error ("<code>: <message>") of the newest failing
   * operation; null when nothing is failing. */
  lastError: string | null
}

export function readSyncStatus(db: LocalDatabase): SyncStatusSnapshot {
  const pending = db.select({ value: count() }).from(syncOutbox).get()
  // Failing = an error from the last completed attempt is still standing on
  // the row: the server rejected it per-item (or it never passed local wire
  // validation). Applied confirmations delete the row, so recovery is
  // automatic. Newest by createdAt: the outbox has no error timestamp and
  // creation is monotone - one representative sample for the tooltip.
  const failing = db
    .select({ value: count() })
    .from(syncOutbox)
    .where(isNotNull(syncOutbox.lastError))
    .get()
  const failingSample = db
    .select({ lastError: syncOutbox.lastError })
    .from(syncOutbox)
    .where(isNotNull(syncOutbox.lastError))
    .orderBy(desc(syncOutbox.createdAt))
    .get()
  // Resolved conflict rows are kept for history - only unresolved ones count.
  const conflicts = db
    .select({ value: count() })
    .from(syncConflicts)
    .where(isNull(syncConflicts.resolvedAt))
    .get()
  return {
    pendingOperations: pending?.value ?? 0,
    failingOperations: failing?.value ?? 0,
    lastError: failingSample?.lastError ?? null,
    unresolvedConflicts: conflicts?.value ?? 0,
    lastSyncedAt: getMetaValue(db, LAST_SYNCED_AT_KEY),
  }
}
