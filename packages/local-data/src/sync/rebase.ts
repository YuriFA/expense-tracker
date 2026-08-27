// Household rebase (household-join design D4/D7): what a device does when its
// household changes (the user joins another household, leaves, or is
// removed). One transaction resets the local bookkeeping so the existing
// initial-sync union (push-all-as-creates + pull-from-zero) applies unchanged
// afterward - the sync engine itself is untouched:
//
// 1. tombstoned rows are dropped (their deletes are meaningless in the new
//    household; pushing never-seen deletes has no protocol semantics),
// 2. the outbox is cleared wholesale and pending conflicts with it (frozen
//    in-flight ops and conflict records reference the OLD household's
//    versions/server states - none of them may ever reach the new one),
// 3. every surviving row's `serverVersion` is zeroed (rows survive as user
//    data),
// 4. the outbox is regenerated: one base-0 upsert per surviving row,
// 5. the pull cursor resets to 0 and the `last_household` marker is stored
//    (a stale second device detects the change by comparing the marker
//    against the server-reported household, D7).
//
// Idempotent by construction: re-running re-zeroes and regenerates.

import { isNotNull } from 'drizzle-orm'
import type { LocalDatabase } from '../types'
import {
  accounts,
  categories,
  debtOperations,
  debtors,
  plannedPayments,
  syncConflicts,
  syncOutbox,
  transactions,
  type SyncEntity,
} from '../schema'
import { enqueueOperation } from '../outbox'
import { rowToPayload, type EntityRow } from './sync-data'
import { setLastHousehold, setPullCursor } from './sync-meta'

/**
 * Rebases the local database for operation against `householdId` (design
 * D4). Call BEFORE letting the sync engine run as the new household; the
 * carry-data choice uses this, the start-clean choice uses `wipeLocalData`
 * and then simply syncs. Both choices should stamp `last_household`
 * (`setLastHousehold`) so the next startup check knows the device is current.
 */
export function rebaseLocalDataForHousehold(db: LocalDatabase, householdId: string): void {
  db.transaction((tx) => {
    // Tombstones never cross households.
    tx.delete(accounts).where(isNotNull(accounts.deletedAt)).run()
    tx.delete(categories).where(isNotNull(categories.deletedAt)).run()
    tx.delete(transactions).where(isNotNull(transactions.deletedAt)).run()
    tx.delete(debtors).where(isNotNull(debtors.deletedAt)).run()
    tx.delete(debtOperations).where(isNotNull(debtOperations.deletedAt)).run()
    tx.delete(plannedPayments).where(isNotNull(plannedPayments.deletedAt)).run()

    // No stale operations or conflict records cross households either.
    tx.delete(syncOutbox).run()
    tx.delete(syncConflicts).run()

    // Survivors become base-0 creates (idempotent-create union semantics).
    tx.update(accounts).set({ serverVersion: 0 }).run()
    tx.update(categories).set({ serverVersion: 0 }).run()
    tx.update(transactions).set({ serverVersion: 0 }).run()
    tx.update(debtors).set({ serverVersion: 0 }).run()
    tx.update(debtOperations).set({ serverVersion: 0 }).run()
    tx.update(plannedPayments).set({ serverVersion: 0 }).run()

    regenerateAsCreates(tx, 'account', tx.select().from(accounts).all())
    regenerateAsCreates(tx, 'category', tx.select().from(categories).all())
    regenerateAsCreates(tx, 'transaction', tx.select().from(transactions).all())
    regenerateAsCreates(tx, 'debtor', tx.select().from(debtors).all())
    regenerateAsCreates(tx, 'debt_operation', tx.select().from(debtOperations).all())
    regenerateAsCreates(tx, 'planned_payment', tx.select().from(plannedPayments).all())

    setPullCursor(tx, 0)
    setLastHousehold(tx, householdId)
  })
}

type LocalTx = Parameters<Parameters<LocalDatabase['transaction']>[0]>[0]

/** Enqueues one fresh base-0 upsert per surviving row (new opIds throughout). */
function regenerateAsCreates(tx: LocalTx, entity: SyncEntity, rows: EntityRow[]): void {
  for (const row of rows) {
    enqueueOperation(tx, {
      entity,
      entityId: row.id,
      op: 'upsert',
      payload: rowToPayload(entity, row),
      baseVersion: 0,
    })
  }
}
