// Main-thread local-db bridge (design D1/D2): spawns the worker lazily,
// resolves the typed Comlink `Remote` only after the worker's ready handshake
// (calls made before that queue behind the promise - messages posted before
// the worker's `expose` would be lost), and publishes the boot state machine
// (`booting` -> `ready` | `db-busy`) plus the engine's run-completion signal.

import * as Comlink from 'comlink'
import { readonly, ref } from 'vue'
import {
  LOCAL_DB_BUSY_SIGNAL,
  LOCAL_DB_READY_SIGNAL,
  LOCAL_DB_RUN_COMPLETE_SIGNAL,
  type LocalDbApi,
  type LocalDbRunCompleteMessage,
} from './local-db-api'

type LocalDbBootState = 'booting' | 'ready' | 'db-busy'

const bootState = ref<LocalDbBootState>('booting')

/** Requests persistent storage for the origin (spec: storage persistence).
 * Best-effort and fire-and-forget; surfaced via `storage.estimate()` later. */
function requestPersistentStorage(): void {
  try {
    void navigator.storage?.persist()
  } catch {
    // A rejected request (or missing API) never blocks boot.
  }
}

const runCompleteListeners = new Set<(wroteLocalData: boolean) => void>()

function boot(): Promise<LocalDbApi> {
  requestPersistentStorage()

  const worker = new Worker(new URL('./local-db-worker.ts', import.meta.url), {
    type: 'module',
  })

  const signal = new Promise<string>((resolve) => {
    const onMessage = (event: MessageEvent) => {
      if (event.data === LOCAL_DB_READY_SIGNAL || event.data === LOCAL_DB_BUSY_SIGNAL) {
        worker.removeEventListener('message', onMessage)
        resolve(event.data as string)
      }
    }
    worker.addEventListener('message', onMessage)
  })

  return signal.then((received) => {
    if (received === LOCAL_DB_BUSY_SIGNAL) {
      // Another tab owns the database: no API exists in this tab. The boot
      // shell renders the already-open banner; its reload action re-runs boot
      // once the holding tab is gone. Queries never start - their repository
      // calls queue on a promise that intentionally never resolves.
      worker.terminate()
      bootState.value = 'db-busy'
      return new Promise<LocalDbApi>(() => {})
    }

    // From here on the remaining worker messages are the engine's
    // run-completion signal (Comlink's wrap endpoint ignores id-less
    // messages).
    worker.addEventListener('message', (event: MessageEvent) => {
      const data = event.data as LocalDbRunCompleteMessage | undefined
      if (data?.type === LOCAL_DB_RUN_COMPLETE_SIGNAL) {
        for (const listener of runCompleteListeners) listener(data.wroteLocalData)
      }
    })

    bootState.value = 'ready'
    // The single `Remote` -> contract cast: Comlink's mapped `Remote<T>` type
    // (nested objects become promises) does not line up with the hand-written
    // RPC contract, but the runtime proxy satisfies it - repository objects
    // are only ever called, never awaited (design D1/D4).
    return Comlink.wrap<LocalDbApi>(worker) as unknown as LocalDbApi
  })
}

let apiPromise: Promise<LocalDbApi> | null = null

/**
 * Singleton accessor for the worker RPC surface. The worker spawns on the
 * first call; every subsequent call shares the same handshake-resolved
 * `Remote`, so calls made during boot simply await it.
 */
export function getLocalDbApi(): Promise<LocalDbApi> {
  apiPromise ??= boot()
  return apiPromise
}

/** The local database boot state for the boot shell (splash / db-busy banner). */
export function useLocalDbBootState() {
  return readonly(bootState)
}

/**
 * Subscribes to the sync engine's run-completion signal (the worker ran a
 * sync cycle; the listener receives whether local rows were written). Returns
 * the unsubscribe function.
 */
export function onSyncRunComplete(listener: (wroteLocalData: boolean) => void): () => void {
  runCompleteListeners.add(listener)
  return () => runCompleteListeners.delete(listener)
}
