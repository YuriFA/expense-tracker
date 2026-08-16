// The sync engine (design D4-D7): an opportunistic cycle of
// push -> resolve conflicts -> pull over the local SQLite database.
//
// Push: before each batch, unsent operations of one record coalesce into one
// full-state operation; per record only the FIRST pending operation goes out
// per cycle (followers are continuations of the same client chain and re-base
// onto the server version their ancestor's confirmation produced). Retries
// reuse the frozen opId/payload (`sentAt`); `attempts` drives exponential
// backoff. Confirmed opIds are removed EXACTLY (never "all ops of the
// record") and the D5 transitions run through `applyPushConfirmations`.
//
// Pull: changes apply to CLEAN records only; a newer change on a DIRTY record
// becomes a persistent conflict (upsert) or applies delete-wins (tombstone).
// The stored cursor advances monotonically.
//
// A 401 mid-run pauses the engine with the queue untouched; `resume()` is
// called after re-authentication. Everything here is transport-agnostic - the
// provider injects the API-client-backed transport, tests inject fakes.

import { eq } from 'drizzle-orm'
import {
  UnauthorizedError,
  pushSyncOperations,
  pullSyncChanges,
  type ApiClient,
  type SyncPushOperation,
  type SyncPushResultItem,
  type SyncPullPage,
} from '@expense-tracker/api'
import type { LocalDatabase, LocalTransaction } from '@/shared/lib/db/database'
import {
  applyPushConfirmations,
  coalesceUnsentOperations,
  pendingOperations,
  type PushConfirmation,
} from '@/shared/lib/db/outbox'
import {
  accounts,
  categories,
  syncOutbox,
  transactions,
  type AccountRow,
  type CategoryRow,
  type SyncOutboxRow,
  type TransactionRow,
} from '@/shared/lib/db/schema'
import {
  applyDeleteWins,
  applyLocalDeleteWins,
  dropOperationsFor,
  findUnresolvedConflict,
  firstPendingOpId,
  recordConflict,
} from './conflicts'
import {
  isRowDeleted,
  payloadToSyncData,
  readEntityRow,
  rowToPayload,
  syncDataToRowPatch,
} from './sync-data'
import {
  LAST_SYNCED_AT_KEY,
  getPullCursor,
  getMetaValue,
  setMetaValue,
  setPullCursor,
} from './sync-meta'

/** Transport seam: the engine never sees the HTTP client itself. */
export interface SyncTransport {
  push(operations: SyncPushOperation[]): Promise<SyncPushResultItem[]>
  pull(cursor: number): Promise<SyncPullPage>
}

/** Builds the transport over the shared API client (session cookie auth). */
export function createApiTransport(client: ApiClient): SyncTransport {
  return {
    push: (operations) => pushSyncOperations(client, operations),
    pull: (cursor) => pullSyncChanges(client, cursor),
  }
}

export interface SyncEngineOptions {
  db: LocalDatabase
  transport: SyncTransport
  /** Called after the engine wrote local data (provider invalidates caches). */
  onDataChanged?: () => void
  /** Injectable clock for tests. */
  now?: () => Date
}

export interface SyncRunOutcome {
  status: 'completed' | 'paused'
  /** Operations the server applied this run. */
  pushed: number
  /** Pulled changes this run (applied, skipped, or conflicted). */
  pulled: number
  /** Conflicts newly recorded this run (push + pull). */
  conflicts: number
}

export interface SyncEngineState {
  running: boolean
  paused: boolean
  lastRunAt: string | null
}

/** Server caps a push batch at 100 operations; stay comfortably below. */
const PUSH_BATCH_SIZE = 50

const BACKOFF_BASE_MS = 5_000
const BACKOFF_CAP_MS = 15 * 60_000

/** Exponential backoff after `attempts` failed attempts (5s -> 15min). */
export function backoffDelayMs(attempts: number): number {
  const exp = Math.max(0, attempts - 1)
  return Math.min(BACKOFF_BASE_MS * 2 ** exp, BACKOFF_CAP_MS)
}

type AnyRowPatch = Partial<AccountRow> | Partial<CategoryRow> | Partial<TransactionRow>

function updateEntityRow(
  tx: LocalTransaction,
  entity: SyncOutboxRow['entity'],
  entityId: string,
  patch: AnyRowPatch,
): void {
  switch (entity) {
    case 'account':
      tx.update(accounts)
        .set(patch as Partial<AccountRow>)
        .where(eq(accounts.id, entityId))
        .run()
      break
    case 'category':
      tx.update(categories)
        .set(patch as Partial<CategoryRow>)
        .where(eq(categories.id, entityId))
        .run()
      break
    case 'transaction':
      tx.update(transactions)
        .set(patch as Partial<TransactionRow>)
        .where(eq(transactions.id, entityId))
        .run()
      break
  }
}

const eq_ = (opId: string) => eq(syncOutbox.opId, opId)

export function createSyncEngine(options: SyncEngineOptions) {
  const { db, transport } = options
  const now = options.now ?? (() => new Date())
  const onDataChanged = options.onDataChanged

  let running = false
  let rerunQueued = false
  let paused = false
  const listeners = new Set<() => void>()

  function emit() {
    for (const listener of listeners) listener()
  }

  function getState(): SyncEngineState {
    return {
      running,
      paused,
      lastRunAt: getMetaValue(db, LAST_SYNCED_AT_KEY),
    }
  }

  function readRecordForCoalescing(
    tx: LocalTransaction,
    entity: SyncOutboxRow['entity'],
    entityId: string,
  ) {
    const row = readEntityRow(tx, entity, entityId)
    if (!row) return null
    return { deleted: isRowDeleted(row), payload: rowToPayload(entity, row) }
  }

  interface SelectedOp {
    op: SyncOutboxRow
    wire: SyncPushOperation
  }

  /**
   * Prepares the next push batch: coalesces unsent groups, drops ops of
   * conflict-blocked records, honors per-op backoff (a `force` run bypasses
   * it - manual refresh), keeps only the first op per record, freezes
   * `sentAt`/`attempts`, and rebases unsent ops onto the record's current
   * `serverVersion` (the D6 chain continuation after an in-flight ancestor
   * confirms).
   */
  function selectPushBatch(force: boolean): SelectedOp[] {
    return db.transaction((tx) => {
      coalesceUnsentOperations(tx, (entity, entityId) =>
        readRecordForCoalescing(tx, entity, entityId),
      )

      const ops = pendingOperations(tx)
      const seenRecords = new Set<string>()
      const nowMs = now().getTime()
      const selected: SelectedOp[] = []

      for (const op of ops) {
        const key = `${op.entity}:${op.entityId}`
        if (seenRecords.has(key)) continue
        seenRecords.add(key)

        // Only a 'version' conflict blocks the record: it waits for the
        // user's keep/take choice. 'deleted' conflicts are informational -
        // delete-wins already applied and a pending delete (local-delete vs
        // remote-edit) must still reach the server.
        if (findUnresolvedConflict(tx, op.entity, op.entityId)?.kind === 'version') continue

        const row = readEntityRow(tx, op.entity, op.entityId)
        if (!row) {
          // The record vanished (unborn create+delete raced the queue).
          tx.delete(syncOutbox).where(eq_(op.opId)).run()
          continue
        }

        const wasFrozen = op.sentAt !== null
        if (
          !force &&
          op.attempts > 0 &&
          op.sentAt !== null &&
          nowMs - Date.parse(op.sentAt) < backoffDelayMs(op.attempts)
        ) {
          continue
        }

        const base = wasFrozen ? op.baseVersion : row.serverVersion
        const data =
          op.op === 'delete' || wasFrozen
            ? decodeStoredPayload(op)
            : payloadToSyncData(op.entity, rowToPayload(op.entity, row))
        if (!data && op.op === 'upsert') {
          // Corrupt payload: keep the op parked with the error visible.
          tx.update(syncOutbox)
            .set({ lastError: 'INVALID_PAYLOAD: local payload failed wire validation' })
            .where(eq_(op.opId))
            .run()
          continue
        }

        tx.update(syncOutbox)
          .set({ sentAt: now().toISOString(), attempts: op.attempts + 1, baseVersion: base })
          .where(eq_(op.opId))
          .run()

        selected.push({
          op,
          wire: {
            opId: op.opId,
            entity: op.entity,
            action: op.op,
            id: op.entityId,
            baseVersion: base,
            ...(op.op === 'upsert' && data ? { data } : {}),
          },
        })

        if (selected.length >= PUSH_BATCH_SIZE) break
      }

      return selected
    })
  }

  function decodeStoredPayload(op: SyncOutboxRow) {
    if (op.op === 'delete') return undefined
    try {
      return payloadToSyncData(op.entity, JSON.parse(op.payloadJson))
    } catch {
      return null
    }
  }

  function handlePushConflict(
    tx: LocalTransaction,
    wire: SyncPushOperation,
    result: SyncPushResultItem,
    outcome: SyncRunOutcome,
  ): void {
    const serverState = result.serverState ?? { version: 0, deleted: false }
    const row = readEntityRow(tx, wire.entity, wire.id)

    if (result.code === 'SYNC_DELETED_CONFLICT' || serverState.deleted) {
      // Delete-vs-edit: delete-wins applies immediately; the lost edit is
      // preserved in the conflict record for restore-as-new.
      applyDeleteWins(tx, {
        entity: wire.entity,
        entityId: wire.id,
        opId: wire.opId,
        baseVersion: wire.baseVersion,
        serverVersion: serverState.version,
      })
      outcome.conflicts += 1
      return
    }

    recordConflict(tx, {
      entity: wire.entity,
      entityId: wire.id,
      opId: wire.opId,
      kind: 'version',
      baseVersion: wire.baseVersion,
      serverVersion: serverState.version,
      localState: row ? rowToPayload(wire.entity, row) : null,
      serverState: {
        version: serverState.version,
        deleted: false,
        ...(serverState.data ? { data: serverState.data } : {}),
      },
    })
    outcome.conflicts += 1
  }

  /**
   * Runs the push loop. Returns false when a transport failure aborted it -
   * the caller then skips the pull phase: with unconfirmed pushes in flight,
   * pulling would echo our own server-applied changes back as
   * pull-newer-on-dirty conflicts (lost-response case). The next successful
   * run replays the frozen opIds first (server idempotency), which turns
   * those echoes stale, and only then pulls.
   */
  async function pushPhase(force: boolean, outcome: SyncRunOutcome): Promise<boolean> {
    for (;;) {
      const batch = selectPushBatch(force)
      if (batch.length === 0) return true

      let results: SyncPushResultItem[]
      try {
        results = await transport.push(batch.map((item) => item.wire))
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          // A 401 is never the operation's fault: revert the attempt counter
          // so the same queue re-pushes immediately after re-login.
          db.transaction((tx) => {
            for (const item of batch) {
              tx.update(syncOutbox)
                .set({ attempts: item.op.attempts })
                .where(eq_(item.op.opId))
                .run()
            }
          })
          paused = true
          outcome.status = 'paused'
          emit()
        }
        // Transport failure: ops stay queued; attempts-driven backoff holds.
        return false
      }

      const confirmations: PushConfirmation[] = []
      const byOpId = new Map(batch.map((item) => [item.wire.opId, item]))

      db.transaction((tx) => {
        for (const result of results) {
          if (result.status === 'applied') {
            confirmations.push({ opId: result.opId, version: result.version ?? 0 })
          } else if (result.status === 'conflict') {
            const item = byOpId.get(result.opId)
            if (item) handlePushConflict(tx, item.wire, result, outcome)
          } else {
            tx.update(syncOutbox)
              .set({
                lastError: `${result.code ?? 'ERROR'}: ${result.message ?? 'operation failed'}`,
              })
              .where(eq_(result.opId))
              .run()
          }
        }
        applyPushConfirmations(tx, confirmations)
      })
      outcome.pushed += confirmations.length

      // No confirmations means no chain progress this batch (conflicts now
      // block their records, errors are backing off) - stop the loop.
      if (confirmations.length === 0) return true
    }
  }

  function insertFromChange(tx: LocalTransaction, change: SyncPullPage['changes'][number]): void {
    if (change.action === 'tombstone' || !change.data) return
    const patch = syncDataToRowPatch(change.entity, change.data)
    if (!patch) return
    const timestamp = now().toISOString()

    if (change.entity === 'account') {
      tx.insert(accounts)
        .values({
          ...(patch as Partial<AccountRow>),
          id: change.id,
          version: change.version,
          serverVersion: change.version,
          deletedAt: null,
          createdAt: timestamp,
        } as typeof accounts.$inferInsert)
        .run()
    } else if (change.entity === 'category') {
      tx.insert(categories)
        .values({
          ...(patch as Partial<CategoryRow>),
          id: change.id,
          version: change.version,
          serverVersion: change.version,
          deletedAt: null,
          createdAt: timestamp,
        } as typeof categories.$inferInsert)
        .run()
    } else {
      tx.insert(transactions)
        .values({
          ...(patch as Partial<TransactionRow>),
          id: change.id,
          updatedAt: null,
          version: change.version,
          serverVersion: change.version,
          deletedAt: null,
        } as typeof transactions.$inferInsert)
        .run()
    }
  }

  function applyPullChange(
    tx: LocalTransaction,
    change: SyncPullPage['changes'][number],
    outcome: SyncRunOutcome,
  ): void {
    const row = readEntityRow(tx, change.entity, change.id)
    if (!row) {
      insertFromChange(tx, change)
      return
    }

    // Already-known revision (e.g. our own pushed change echoing back).
    if (change.version <= row.serverVersion) return

    if (findUnresolvedConflict(tx, change.entity, change.id)) {
      // Refresh the existing conflict's server side; the record stays put.
      recordConflict(tx, {
        entity: change.entity,
        entityId: change.id,
        opId: firstPendingOpId(tx, change.entity, change.id),
        kind: 'version',
        baseVersion: row.serverVersion,
        serverVersion: change.version,
        localState: rowToPayload(change.entity, row),
        serverState: {
          version: change.version,
          deleted: change.action === 'tombstone',
          ...(change.data ? { data: change.data } : {}),
        },
      })
      return
    }

    if (row.version === row.serverVersion) {
      // CLEAN: the pulled state replaces the local state entirely.
      if (change.action === 'tombstone') {
        updateEntityRow(tx, change.entity, change.id, {
          deletedAt: now().toISOString(),
          version: change.version,
          serverVersion: change.version,
        })
      } else if (change.data) {
        const patch = syncDataToRowPatch(change.entity, change.data)
        if (patch) {
          updateEntityRow(tx, change.entity, change.id, {
            ...patch,
            deletedAt: null,
            version: change.version,
            serverVersion: change.version,
          })
        }
      }
      return
    }

    // DIRTY: never overwrite unconfirmed local changes.
    if (change.action === 'tombstone') {
      if (row.deletedAt !== null) {
        // Delete-vs-delete: both sides deleted - converge silently (the
        // pending local delete is redundant, the server is already there)
        // and notify nobody, matching the idempotent delete semantics.
        updateEntityRow(tx, change.entity, change.id, {
          version: change.version,
          serverVersion: change.version,
        })
        dropOperationsFor(tx, change.entity, change.id)
        return
      }
      // Remote delete vs local edit: delete-wins applies immediately; the
      // lost edit is preserved in the conflict record for restore-as-new.
      applyDeleteWins(tx, {
        entity: change.entity,
        entityId: change.id,
        opId: firstPendingOpId(tx, change.entity, change.id),
        baseVersion: row.serverVersion,
        serverVersion: change.version,
      })
    } else if (row.deletedAt !== null) {
      // Local delete vs remote edit: delete-wins by default in this direction
      // too - the tombstone is re-based onto the remote edit and re-pushed,
      // the lost remote edit is preserved for restore-as-new.
      applyLocalDeleteWins(tx, {
        entity: change.entity,
        entityId: change.id,
        opId: firstPendingOpId(tx, change.entity, change.id),
        baseVersion: row.serverVersion,
        serverVersion: change.version,
        lostEdit: change.data ?? null,
        serverState: {
          version: change.version,
          deleted: false,
          ...(change.data ? { data: change.data } : {}),
        },
      })
    } else {
      recordConflict(tx, {
        entity: change.entity,
        entityId: change.id,
        opId: firstPendingOpId(tx, change.entity, change.id),
        kind: 'version',
        baseVersion: row.serverVersion,
        serverVersion: change.version,
        localState: rowToPayload(change.entity, row),
        serverState: {
          version: change.version,
          deleted: false,
          ...(change.data ? { data: change.data } : {}),
        },
      })
    }
    outcome.conflicts += 1
  }

  async function pullPhase(outcome: SyncRunOutcome): Promise<void> {
    for (;;) {
      const cursor = getPullCursor(db)

      let page: SyncPullPage
      try {
        page = await transport.pull(cursor)
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          paused = true
          outcome.status = 'paused'
          emit()
        }
        return
      }

      db.transaction((tx) => {
        for (const change of page.changes) applyPullChange(tx, change, outcome)
        // nextCursor is null when caught up: advance to the last applied seq.
        const next =
          page.nextCursor ??
          (page.changes.length > 0 ? page.changes[page.changes.length - 1].seq : cursor)
        setPullCursor(tx, next)
      })
      outcome.pulled += page.changes.length

      if (page.nextCursor === null) return
    }
  }

  async function run(runOptions: { force?: boolean } = {}): Promise<SyncRunOutcome> {
    if (paused) {
      return { status: 'paused', pushed: 0, pulled: 0, conflicts: 0 }
    }
    if (running) {
      rerunQueued = true
      return { status: 'completed', pushed: 0, pulled: 0, conflicts: 0 }
    }

    running = true
    emit()
    const outcome: SyncRunOutcome = { status: 'completed', pushed: 0, pulled: 0, conflicts: 0 }

    try {
      const pushClean = await pushPhase(runOptions.force === true, outcome)
      // Pull only after a clean push phase (see pushPhase for the echo
      // rationale) and never while paused for re-authentication.
      if (pushClean && !paused) await pullPhase(outcome)
      if (!paused) setMetaValue(db, LAST_SYNCED_AT_KEY, now().toISOString())
    } finally {
      running = false
      emit()
      onDataChanged?.()
    }

    if (rerunQueued && !paused) {
      rerunQueued = false
      return run()
    }
    rerunQueued = false
    return outcome
  }

  /** Re-authentication clears the pause; the next trigger re-runs the cycle. */
  function resume(): void {
    paused = false
    emit()
  }

  return {
    run,
    resume,
    getState,
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export type SyncEngine = ReturnType<typeof createSyncEngine>
