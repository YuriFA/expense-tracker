// `sync_meta` accessors: the owner binding, the pull cursor, the device id,
// and the full local wipe used when a different user takes over the device
// (design D9). KV-shaped so no migration is ever needed for new keys.

import { eq, inArray } from 'drizzle-orm'
import type { LocalDatabase, LocalTransaction } from '../types'
import {
  accounts,
  categories,
  debtOperations,
  debtors,
  plannedPayments,
  syncConflicts,
  syncMeta,
  syncOutbox,
  transactions,
} from '../schema'

type DbLike = LocalDatabase | LocalTransaction

const OWNER_USER_ID_KEY = 'owner_user_id'
const PULL_CURSOR_KEY = 'pull_cursor'
const LAST_HOUSEHOLD_KEY = 'last_household'
export const LAST_SYNCED_AT_KEY = 'last_synced_at'

export function getMetaValue(db: DbLike, key: string): string | null {
  const row = db.select().from(syncMeta).where(eq(syncMeta.key, key)).get()
  return row?.value ?? null
}

export function setMetaValue(db: DbLike, key: string, value: string): void {
  db.insert(syncMeta)
    .values({ key, value })
    .onConflictDoUpdate({ target: syncMeta.key, set: { value } })
    .run()
}

/** The user this local database belongs to; null = anonymous/unowned. */
export function getOwnerUserId(db: DbLike): string | null {
  return getMetaValue(db, OWNER_USER_ID_KEY)
}

export function setOwnerUserId(db: DbLike, userId: string): void {
  setMetaValue(db, OWNER_USER_ID_KEY, userId)
}

/** Last change-log seq the client has fully applied. */
export function getPullCursor(db: DbLike): number {
  const raw = getMetaValue(db, PULL_CURSOR_KEY)
  const parsed = raw === null ? Number.NaN : Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function setPullCursor(db: DbLike, cursor: number): void {
  setMetaValue(db, PULL_CURSOR_KEY, cursor.toString())
}

/**
 * The household this database last rebased/started syncing against (design
 * D7). null = never tracked (fresh install or after a wipe) - no mismatch.
 * Stored by the join/leave flows right after the rebase/wipe choice; a
 * mismatch against the server-reported household means this device still
 * holds the OLD household's state and must offer the choice again.
 */
export function getLastHousehold(db: DbLike): string | null {
  return getMetaValue(db, LAST_HOUSEHOLD_KEY)
}

export function setLastHousehold(db: DbLike, householdId: string): void {
  setMetaValue(db, LAST_HOUSEHOLD_KEY, householdId)
}

/**
 * True when the device's bookkeeping belongs to a DIFFERENT household than
 * the one reported by the server (a stale second device of a user who
 * joined/left elsewhere). Never true for an untracked (null) marker.
 */
export function householdNeedsRebase(db: DbLike, currentHouseholdId: string): boolean {
  const last = getLastHousehold(db)
  return last !== null && last !== currentHouseholdId
}

/**
 * Clears ALL local data (records, outbox, conflicts, owner/cursor) - the
 * explicit "clear local data" choice when a different user logs in. Callers
 * must invalidate every UI cache afterwards.
 */
export function wipeLocalData(db: LocalDatabase): void {
  db.transaction((tx) => {
    wipeLocalDataInTx(tx)
  })
}

/** Core wipe logic that operates inside an already-open transaction. */
export function wipeLocalDataInTx(tx: LocalTransaction): void {
  tx.delete(transactions).run()
  // Plans reference accounts/categories: wipe referencing rows first,
  // mirroring the retention order.
  tx.delete(plannedPayments).run()
  tx.delete(accounts).run()
  tx.delete(categories).run()
  // Debt rows go referencing-rows-first, mirroring the retention order.
  tx.delete(debtOperations).run()
  tx.delete(debtors).run()
  tx.delete(syncOutbox).run()
  tx.delete(syncConflicts).run()
  tx.delete(syncMeta)
    .where(
      inArray(syncMeta.key, [
        OWNER_USER_ID_KEY,
        PULL_CURSOR_KEY,
        LAST_SYNCED_AT_KEY,
        LAST_HOUSEHOLD_KEY,
      ]),
    )
    .run()
}
