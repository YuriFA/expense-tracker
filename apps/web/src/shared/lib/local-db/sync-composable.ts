// The sync controller (design D6): the engine lives in the local-db worker;
// this main-thread composable publishes its state over the RPC `subscribe`,
// exposes `runNow`, wires the opportunistic web triggers (visibility,
// reconnect, post-mutation debounce), and gates every run on authentication
// (login resumes + kicks the engine - that is also the initial sync right
// after the ownership gate; anonymous mode never runs - the outbox waits).
//
// FSD placement: shared/lib must not import entities, so the app layer
// injects the auth getter (`provideSyncController({ isAuthenticated })` in
// AppShell); widgets/features consume the controller via `useSyncController`.

import { onScopeDispose, provide, inject, ref, watch, type InjectionKey, type Ref } from 'vue'
import { proxy } from 'comlink'
import { useMutationCache, useQueryCache } from '@pinia/colada'
import type { SyncEngineState } from '@expense-tracker/local-data'
import { getLocalDbApi, onLocalDataChanged } from '@/shared/lib/local-db'

const POST_MUTATION_DEBOUNCE_MS = 2_500

interface SyncControllerOptions {
  /** Auth gate supplied by the app layer: sync runs only while true. */
  isAuthenticated: () => boolean
  /**
   * Household gate (household-join design D7), injected by the app layer
   * because shared/lib must not import entities: called on login/startup
   * BEFORE the engine runs; resolves once the local bookkeeping matches the
   * server-reported household (a stale second device picks the carry/clean
   * choice first through the pending dialog). Never throws - offline skips
   * the check silently and sync proceeds.
   */
  ensureHouseholdCurrent?: () => Promise<void>
}

export interface SyncController {
  engineState: Readonly<Ref<SyncEngineState>>
  /** Manual refresh: bypasses backoff and runs a full cycle now. */
  runNow(force?: boolean): void
  /** Whether the global conflict center dialog is open (badge toggles it). */
  conflictsOpen: Ref<boolean>
}

const SYNC_CONTROLLER_KEY: InjectionKey<SyncController> = Symbol('sync-controller')

/** Creates the app's single sync controller and provides it down the tree. */
export function provideSyncController(options: SyncControllerOptions): SyncController {
  const queryCache = useQueryCache()
  const mutationCache = useMutationCache()

  const engineState = ref<SyncEngineState>({ running: false, paused: false, lastRunAt: null })
  const conflictsOpen = ref(false)

  function runNow(force = false): void {
    void getLocalDbApi().then((api) => api.sync.run(force))
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  function scheduleRun(delayMs: number): void {
    if (!options.isAuthenticated()) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      runNow()
    }, delayMs)
  }

  // Login/restore resumes the (possibly 401-paused) engine and kicks a cycle;
  // this is also the initial sync right after the ownership gate passes. The
  // household gate composes BEFORE the run: it holds the cycle until the
  // device's last_household marker matches the server household (design D7).
  const stopAuthWatch = watch(
    options.isAuthenticated,
    (authenticated) => {
      if (!authenticated) return
      void getLocalDbApi().then(async (api) => {
        await api.sync.resume()
        await options.ensureHouseholdCurrent?.()
        await api.sync.run()
      })
    },
    { immediate: true },
  )

  // Foreground / reconnect triggers (mobile's AppState + NetInfo mapping).
  function onVisibilityChange() {
    if (document.visibilityState === 'visible') scheduleRun(0)
  }
  function onOnline() {
    scheduleRun(0)
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('online', onOnline)

  // Post-mutation debounce: a successfully settled colada mutation means
  // local data changed - schedule a run. Bridges the mutation cache (an
  // external store) into the sync lifecycle, hence a watch. Pinia unwraps
  // the state ref, so `caches` is the reactive Map itself.
  const stopMutationWatch = watch(
    () => {
      let successful = 0
      for (const entry of mutationCache.caches.values()) {
        if (entry.state.value.status === 'success') successful += 1
      }
      return successful
    },
    (successful, previous) => {
      if (successful > (previous ?? 0)) scheduleRun(POST_MUTATION_DEBOUNCE_MS)
    },
  )

  // The engine wrote local data (push confirmations / pulled changes):
  // invalidate every cached query - the colada equivalent of the mobile
  // `queryClient.invalidateQueries()` (design D6).
  const stopDataChanged = onLocalDataChanged(() => {
    void queryCache.invalidateQueries()
  })

  // Engine state over the RPC bridge: Comlink delivers the listener as a
  // proxy, so each notification pulls the fresh snapshot.
  const cleanups: Array<() => void> = [
    stopAuthWatch,
    stopMutationWatch,
    stopDataChanged,
    () => document.removeEventListener('visibilitychange', onVisibilityChange),
    () => window.removeEventListener('online', onOnline),
    () => {
      if (debounceTimer) clearTimeout(debounceTimer)
    },
    () => {
      disposed = true
    },
  ]

  let disposed = false
  void getLocalDbApi().then(async (api) => {
    const unsubscribe = await api.sync.subscribe(
      proxy(() => {
        void api.sync.getState().then((state) => {
          engineState.value = state
        })
      }),
    )
    if (disposed) {
      void unsubscribe()
      return
    }
    engineState.value = await api.sync.getState()
    cleanups.push(() => void unsubscribe())
  })

  // AppShell hosts the controller for the app's whole lifetime, but stay
  // correct if the hosting scope is ever disposed.
  onScopeDispose(() => {
    for (const cleanup of cleanups) cleanup()
  })

  const controller: SyncController = { engineState, runNow, conflictsOpen }
  provide(SYNC_CONTROLLER_KEY, controller)
  return controller
}

/** Injects the app's sync controller; throws when the provider is missing. */
export function useSyncController(): SyncController {
  const controller = inject(SYNC_CONTROLLER_KEY)
  if (!controller) {
    throw new Error('useSyncController requires provideSyncController in AppShell')
  }
  return controller
}
