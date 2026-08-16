// Sync endpoint client: batched push of pending operations with per-item
// results, and the cursor pull. Platform-agnostic like every HTTP call here -
// callers supply the fetch-backed ApiClient. Per-item conflict/error results
// arrive in a 200 response and are returned as data (NOT thrown): only
// transport/auth failures reject.

import type { ApiClient } from '../api-client'
import type { components } from '../schema'

export type SyncEntityKind = components['schemas']['SyncEntity']
export type AccountSyncData = components['schemas']['AccountSyncData']
export type CategorySyncData = components['schemas']['CategorySyncData']
export type TransactionSyncData = components['schemas']['TransactionSyncData']

/** Full record state of an operation/change, shape depends on `entity`. */
export type SyncOperationData = AccountSyncData | CategorySyncData | TransactionSyncData

/** One pending client operation to push. */
export interface SyncPushOperation {
  /** Client-generated operation id - the persistent idempotency key. */
  opId: string
  entity: SyncEntityKind
  action: 'upsert' | 'delete'
  /** Record id (client-generated UUID for baseVersion 0). */
  id: string
  /** Server version the operation is based on; 0 = create. */
  baseVersion: number
  /** Full record state; required for upsert, omitted for delete. */
  data?: SyncOperationData
}

/** The server's current view of a record, attached to conflict results. */
export interface SyncServerState {
  version: number
  deleted: boolean
  data?: SyncOperationData
}

/** Per-item push outcome; the endpoint itself always answers 200. */
export interface SyncPushResultItem {
  opId: string
  status: 'applied' | 'conflict' | 'error'
  /** New server version (status = applied). */
  version?: number
  /** Machine code (status = conflict/error), e.g. SYNC_VERSION_CONFLICT. */
  code?: string
  message?: string
  serverState?: SyncServerState
}

/** One change-log entry delivered by a pull. */
export interface SyncChangeItem {
  seq: number
  entity: SyncEntityKind
  id: string
  action: 'upsert' | 'tombstone'
  /** Server version of the record after this change. */
  version: number
  /** Full record state; present for upsert changes. */
  data?: SyncOperationData
}

export interface SyncPullPage {
  changes: SyncChangeItem[]
  /** Cursor of the next page; null when fully caught up. */
  nextCursor: number | null
}

/**
 * Pushes a batch of operations. Resolve value = per-item results in request
 * order; rejects only on transport/auth failures (RepositoryError).
 */
export async function pushSyncOperations(
  client: ApiClient,
  operations: SyncPushOperation[],
): Promise<SyncPushResultItem[]> {
  const { data } = await client.POST('/api/sync/push', {
    body: {
      operations: operations.map((op) => ({
        opId: op.opId,
        entity: op.entity,
        action: op.action,
        id: op.id,
        baseVersion: op.baseVersion,
        ...(op.data !== undefined ? { data: op.data } : {}),
      })),
    },
  })
  if (!data) {
    throw new Error('Expected a sync push response body but received none')
  }
  return data.results.map((result) => ({
    opId: result.opId,
    status: result.status,
    ...(result.version !== undefined ? { version: result.version } : {}),
    ...(result.code !== undefined ? { code: result.code } : {}),
    ...(result.message !== undefined ? { message: result.message } : {}),
    ...(result.serverState !== undefined
      ? {
          serverState: {
            version: result.serverState.version,
            deleted: result.serverState.deleted,
            ...(result.serverState.data !== undefined
              ? { data: result.serverState.data as SyncOperationData }
              : {}),
          },
        }
      : {}),
  }))
}

/**
 * Pulls the change-log page strictly after `cursor`. When `nextCursor` is
 * null the client is caught up and must still advance its stored cursor to
 * the seq of the last change it applied (the server reports null, not the
 * final seq).
 */
export async function pullSyncChanges(
  client: ApiClient,
  cursor: number,
  limit?: number,
): Promise<SyncPullPage> {
  const { data } = await client.GET('/api/sync/pull', {
    params: { query: { cursor, ...(limit !== undefined ? { limit } : {}) } },
  })
  if (!data) {
    throw new Error('Expected a sync pull response body but received none')
  }
  return {
    changes: data.changes.map((change) => ({
      seq: change.seq,
      entity: change.entity,
      id: change.id,
      action: change.action,
      version: change.version,
      ...(change.data !== undefined ? { data: change.data as SyncOperationData } : {}),
    })),
    nextCursor: data.nextCursor ?? null,
  }
}
