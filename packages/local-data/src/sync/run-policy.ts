// The sync run-policy — one owner for WHEN the engine runs: the post-mutation
// debounce, the gate order (authenticated → household-current → run), and the
// post-cycle cache invalidation rule. The apps adapt platform event sources
// to the notify* surface (web: visibility/online + the colada mutation watch;
// mobile: AppState/NetInfo + the react-query mutation cache) and keep only
// presentation. The engine itself stays transport-pure (ADR-0003 shape): this
// module composes it, never modifies it.

/** Post-mutation debounce: coalesces a burst of local writes into one run. */
const POST_MUTATION_DEBOUNCE_MS = 2_500

/**
 * Query-key roots backed by the local database, by entity: the apps' entity
 * composables build their cache keys from these, and the run-policy
 * invalidates exactly this set (and nothing else - control-plane queries
 * like household/sessions/invite are never served from the local database
 * and must not refetch on sync).
 */
export const SYNC_QUERY_KEY_ROOTS = {
  transactions: ['transactions'],
  accounts: ['accounts'],
  categories: ['categories'],
  debtors: ['debtors'],
  debtOperations: ['debt-operations'],
  plannedPayments: ['planned-payments'],
} as const

/** The roots as a flat list (the run-policy's invalidation set). */
export const LOCAL_DATA_QUERY_KEY_ROOTS: readonly (readonly string[])[] =
  Object.values(SYNC_QUERY_KEY_ROOTS)

const SYNC_STATUS_QUERY_KEY: readonly string[] = ['sync']

/** The engine surface the policy drives; the engine coalesces overlapping runs. */
export interface SyncRunPolicyEngine {
  run(options?: { force?: boolean }): unknown
  /** Re-authentication clears the engine's 401 pause. */
  resume(): void
}

export interface SyncRunPolicyOptions {
  engine: SyncRunPolicyEngine
  /** Auth gate: sync runs only while true (anonymous mode never runs - the outbox waits). */
  isAuthenticated(): boolean
  /**
   * Household gate (household-join D7): resolves once the local bookkeeping
   * matches the server-reported household (a stale second device picks the
   * carry/clean choice first). Rejects when the check cannot complete (e.g.
   * offline): the pending run is then SKIPPED, never executed un-gated, and
   * retried at the next session boundary. Omitting it makes the gate a no-op.
   */
  ensureHouseholdCurrent?(): Promise<void>
  /** Applies the policy's invalidation decisions to the app's query cache. */
  invalidateKeys(keys: readonly (readonly string[])[]): void
  /**
   * The engine's completion source ({ wroteLocalData }): web wires the worker
   * bridge signal, mobile the engine constructor option.
   */
  onRunComplete(cb: (result: { wroteLocalData: boolean }) => void): () => void
}

export interface SyncRunPolicy {
  /** Auth state changed; apps also call once with the restored state at startup. */
  notifyAuthChange(authenticated: boolean): void
  /** App start, app foreground, regained connectivity. */
  notifySessionBoundary(): void
  /** A local mutation settled successfully. */
  notifyLocalMutation(): void
  /** Manual refresh: full cycle now, no household re-check (in-session fast path). */
  runNow(force?: boolean): void
  dispose(): void
}

export function createSyncRunPolicy(options: SyncRunPolicyOptions): SyncRunPolicy {
  const { engine, isAuthenticated, invalidateKeys, onRunComplete } = options

  let disposed = false
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  /** Whether the next scheduled run must (re)run the household check. */
  let needsHouseholdCheck = true
  let householdCurrent = false
  let checkInFlight: Promise<void> | null = null

  const stopOnRunComplete = onRunComplete(({ wroteLocalData }) => {
    // Sync status may change on every completed cycle (outbox, lastSyncedAt);
    // entity caches refetch only when the cycle actually wrote local rows - a
    // no-op cycle (caught-up pull, offline failure) leaves screens untouched.
    const keys = wroteLocalData
      ? [SYNC_STATUS_QUERY_KEY, ...LOCAL_DATA_QUERY_KEY_ROOTS]
      : [SYNC_STATUS_QUERY_KEY]
    invalidateKeys(keys)
  })

  async function runHouseholdCheck(): Promise<boolean> {
    const gate = options.ensureHouseholdCurrent
    if (!gate) {
      householdCurrent = true
      needsHouseholdCheck = false
      return true
    }
    if (!checkInFlight) {
      checkInFlight = (async () => {
        try {
          await gate()
          householdCurrent = true
          needsHouseholdCheck = false
        } catch {
          householdCurrent = false
          needsHouseholdCheck = true
        } finally {
          checkInFlight = null
        }
      })()
    }
    await checkInFlight
    return householdCurrent
  }

  async function gatedRun(recheck: boolean, force = false): Promise<void> {
    if (disposed || !isAuthenticated()) return
    // A choice dialog is open: park behind it instead of slipping past.
    if (checkInFlight) await checkInFlight
    if (recheck || !householdCurrent) {
      // Unknown or stale household currency: never run without the check -
      // a rejected (offline) check skips this run; the next boundary retries.
      if (!(await runHouseholdCheck())) return
    }
    void engine.run({ force })
  }

  function schedule(delayMs: number, recheck: boolean): void {
    if (recheck) needsHouseholdCheck = true
    if (!isAuthenticated()) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void gatedRun(needsHouseholdCheck)
    }, delayMs)
  }

  return {
    notifyAuthChange(authenticated) {
      if (!authenticated) {
        householdCurrent = false
        needsHouseholdCheck = true
        return
      }
      // Login/restore resumes the (possibly 401-paused) engine and kicks a
      // cycle - also the initial sync right after the ownership gate passes.
      engine.resume()
      void gatedRun(true)
    },
    notifySessionBoundary() {
      schedule(0, true)
    },
    notifyLocalMutation() {
      schedule(POST_MUTATION_DEBOUNCE_MS, false)
    },
    runNow(force = false) {
      void gatedRun(false, force)
    },
    dispose() {
      disposed = true
      if (debounceTimer) clearTimeout(debounceTimer)
      stopOnRunComplete()
    },
  }
}
