// `sync_meta` accessors: the owner binding, the pull cursor, the device id,
// and the full local wipe used when a different user takes over the device
// (design D9). KV-shaped so no migration is ever needed for new keys.

import { eq, inArray } from 'drizzle-orm'
import type { LocalDatabase, LocalTransaction } from '@/shared/lib/db/database'
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
} from '@/shared/lib/db/schema'

type DbLike = LocalDatabase | LocalTransaction

const OWNER_USER_ID_KEY = 'owner_user_id'
const PULL_CURSOR_KEY = 'pull_cursor'
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
 * Clears ALL local data (records, outbox, conflicts, owner/cursor) - the
 * explicit "clear local data" choice when a different user logs in. Callers
 * must invalidate every UI cache afterwards.
 */
export function wipeLocalData(db: LocalDatabase): void {
  db.transaction((tx) => {
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
      .where(inArray(syncMeta.key, [OWNER_USER_ID_KEY, PULL_CURSOR_KEY, LAST_SYNCED_AT_KEY]))
      .run()
  })
}
