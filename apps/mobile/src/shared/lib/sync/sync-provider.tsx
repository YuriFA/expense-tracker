// React wiring of the sync engine: creates it once over the local database
// and the shared API client, and mounts the opportunistic triggers (design
// D7): app start / foreground, NetInfo reconnect, post-mutation debounce,
// manual refresh. Runs are gated on authentication (the app is fully usable
// anonymously; the outbox just waits). The 401 pause/resume is bridged with
// the auth provider: a paused engine stays paused until re-login resumes it.
//
// Also hosts the conflict-presenter seam: the sync status badge (widgets
// layer) can ask the conflict center (features layer) to surface unresolved
// conflicts without the two layers importing each other.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import NetInfo from '@react-native-community/netinfo'
import { AppState, type AppStateStatus } from 'react-native'
import { apiClient } from '@/shared/api/client'
import { useAuth } from '@/entities/session/model/use-auth'
import { useLocalDatabase } from '@/shared/lib/db/database-context'
import {
  createApiTransport,
  createSyncEngine,
  type SyncEngine,
  type SyncEngineState,
} from './sync-engine'

/** Debounce between a local mutation and the opportunistic sync run. */
const POST_MUTATION_DEBOUNCE_MS = 2_500

export interface SyncController {
  engine: SyncEngine
  engineState: SyncEngineState
  /** Manual refresh: bypasses backoff and runs a full cycle now. */
  runNow: () => void
  /** Asks the mounted conflict presenter to surface unresolved conflicts. */
  presentConflicts: () => void
  /** Registers the conflict presenter (the conflict center mounts it). */
  registerConflictPresenter: (presenter: (() => void) | null) => void
}

const SyncContext = createContext<SyncController | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const db = useLocalDatabase()
  const queryClient = useQueryClient()
  const { status: authStatus } = useAuth()

  const [engine] = useState(() =>
    createSyncEngine({
      db,
      transport: createApiTransport(apiClient),
      onDataChanged: () => {
        // The engine is a writer beside the repositories (design D3): after
        // its writes every cached query (entities + sync status) refetches.
        void queryClient.invalidateQueries()
      },
    }),
  )

  const [engineState, setEngineState] = useState<SyncEngineState>(() => engine.getState())
  useEffect(() => engine.subscribe(() => setEngineState(engine.getState())), [engine])

  // The engine only runs while authenticated; logging in resumes + kicks it
  // (this is also the initial sync right after the ownership check passes).
  useEffect(() => {
    if (authStatus === 'authenticated') {
      engine.resume()
      void engine.run()
    }
  }, [authStatus, engine])

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleSync = useCallback(
    (delayMs: number) => {
      if (authStatus !== 'authenticated') return
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        debounceTimer.current = null
        void engine.run()
      }, delayMs)
    },
    [authStatus, engine],
  )
  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    },
    [],
  )

  // Reconnect / foreground / post-mutation triggers.
  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) scheduleSync(0)
    })
    const appStateSubscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') scheduleSync(0)
    })
    const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
      const action = (event as { action?: { type?: string } }).action
      if (event.type === 'updated' && action?.type === 'success') {
        scheduleSync(POST_MUTATION_DEBOUNCE_MS)
      }
    })
    return () => {
      unsubscribeNetInfo()
      appStateSubscription.remove()
      unsubscribeMutations()
    }
  }, [queryClient, scheduleSync])

  const conflictPresenterRef = useRef<(() => void) | null>(null)
  const registerConflictPresenter = useCallback((presenter: (() => void) | null) => {
    conflictPresenterRef.current = presenter
  }, [])
  const presentConflicts = useCallback(() => {
    conflictPresenterRef.current?.()
  }, [])

  const value = useMemo<SyncController>(
    () => ({
      engine,
      engineState,
      runNow: () => {
        void engine.run({ force: true })
      },
      presentConflicts,
      registerConflictPresenter,
    }),
    [engine, engineState, presentConflicts, registerConflictPresenter],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

/** Injects the sync controller; throws when the provider is missing. */
export function useSyncController(): SyncController {
  const controller = useContext(SyncContext)
  if (!controller) {
    throw new Error('useSyncController requires <SyncProvider> in the tree')
  }
  return controller
}
