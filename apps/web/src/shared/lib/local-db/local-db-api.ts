// The typed RPC contract between the main thread and the local-db worker
// (design D1): repositories are exposed as plain async-method objects over
// Comlink; the sync engine's subscribe/state surface and the sync-meta owner
// helpers ride the same bridge. Type-only module - imported by both sides.

import type {
  AccountRepository,
  CategoryRepository,
  DebtorRepository,
  DebtOperationRepository,
  TransactionRepository,
} from '@expense-tracker/api'
import type {
  LocalPlannedPaymentRepository,
  LocalSyncConflict,
  SyncEngineState,
  SyncRunOutcome,
  SyncStatusSnapshot,
} from '@expense-tracker/local-data'

/** Worker -> main boot signals (plain strings: Comlink ignores id-less messages). */
export const LOCAL_DB_READY_SIGNAL = 'expense-tracker:local-db-ready'
export const LOCAL_DB_BUSY_SIGNAL = 'expense-tracker:local-db-busy'
/** The sync engine wrote local data - invalidate every UI cache (design D6). */
export const LOCAL_DB_DATA_CHANGED_SIGNAL = 'expense-tracker:local-db-data-changed'

/** The Web Locks name guarding single-tab database exclusivity (design D3). */
export const LOCAL_DB_LOCK_NAME = 'expense-tracker-local-db'

interface LocalDbSyncApi {
  run(force?: boolean): Promise<SyncRunOutcome>
  /** Clears a 401 pause; the next trigger re-runs the cycle. */
  resume(): Promise<void>
  getState(): Promise<SyncEngineState>
  /**
   * Engine state listener over the bridge (callback crossed via Comlink
   * `proxy()`); the resolved function unsubscribes.
   */
  subscribe(listener: () => void): Promise<() => void>
  readStatus(): Promise<SyncStatusSnapshot>
  listUnresolvedConflicts(): Promise<LocalSyncConflict[]>
  getConflict(conflictId: string): Promise<LocalSyncConflict | null>
  resolveConflictKeepLocal(conflictId: string): Promise<void>
  resolveConflictTakeServer(conflictId: string): Promise<void>
  markConflictResolved(conflictId: string): Promise<void>
}

interface LocalDbMetaApi {
  /** The user this local database belongs to; null = anonymous/unowned. */
  getOwnerUserId(): Promise<string | null>
  setOwnerUserId(userId: string): Promise<void>
  /** Clears ALL local data (the ownership gate's destructive choice). */
  wipeLocalData(): Promise<void>
}

export interface LocalDbApi {
  accounts: AccountRepository
  categories: CategoryRepository
  transactions: TransactionRepository
  debtors: DebtorRepository
  debtOperations: DebtOperationRepository
  plannedPayments: LocalPlannedPaymentRepository
  sync: LocalDbSyncApi
  meta: LocalDbMetaApi
}
