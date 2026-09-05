import '../../global.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import NetInfo from '@react-native-community/netinfo'
import { AppState, type AppStateStatus, View } from 'react-native'
import { QueryClientProvider } from '@tanstack/react-query'
import { Uniwind } from 'uniwind'
import { ThemeProvider } from '@/shared/config/theme'
import { BottomSheetProvider } from '@/shared/ui/bottom-sheet/bottom-sheet-provider'
import { Text } from '@/shared/ui/text'
import { DatabaseProvider, useLocalDatabase } from '@/shared/lib/db/database-context'
import { openLocalDatabase } from '@/shared/lib/db/database'
import { connectQueryFocusManager, createQueryClient } from '@/shared/lib/query/query-client'
import { AuthProvider, useAuth } from '@/entities/session'
import { AccountRepositoryProvider, createLocalAccountRepository } from '@/entities/account'
import { CategoryRepositoryProvider, createLocalCategoryRepository } from '@/entities/category'
import {
  TransactionRepositoryProvider,
  createLocalTransactionRepository,
} from '@/entities/transaction'
import {
  DebtRepositoryProvider,
  createLocalDebtOperationRepository,
  createLocalDebtorRepository,
} from '@/entities/debt'
import {
  PlannedPaymentRepositoryProvider,
  createLocalPlannedPaymentRepository,
} from '@/entities/planned-payment'
import { registerBackgroundSync } from '@/shared/lib/sync/background-sync'
import { createLocalSyncTransport } from '@/shared/lib/sync/transport'
import { APP_VERSION } from '@/shared/config/app-version'
import { API_BASE_URL } from '@/shared/api/client'
import {
  configureIdFactory,
  createSyncEngine,
  type SyncEngineState,
} from '@expense-tracker/local-data'
import { randomUUID } from 'expo-crypto'
import { SyncContext, type SyncController } from '@/shared/lib/sync/sync-context'
import { ConflictCenter } from '@/features/sync-conflicts'
import { HouseholdRebaseGuard } from '@/features/household-join'

// Hermes has no WebCrypto: bind the shared id factory to expo-crypto before
// any database work (ids are minted inside @expense-tracker/local-data).
configureIdFactory(randomUUID)

// Boot version line (spec: `app-version`): one console.info identifying the
// running build, so "is the app on the right version?" is answered without
// server access and mobile/api drift is visible. The API part is
// fire-and-forget and bypasses the API client (no session semantics): an
// offline start logs the mobile-only line and never blocks boot.
async function logBuildVersions(): Promise<void> {
  const parts = [`mobile ${APP_VERSION}`]
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`)
    if (res.ok) {
      const health = (await res.json()) as { version?: string }
      if (health.version) parts.push(`api ${health.version}`)
    }
  } catch {
    // API unreachable: keep the mobile-only line.
  }
  console.info(`[expense-tracker] ${parts.join(' · ')}`)
}
void logBuildVersions()

/**
 * Feeds safe-area insets into Uniwind so `*-safe` utilities (e.g. Screen's
 * `p-safe`) resolve with real values. react-native-safe-area-context@5.6 has
 * no SafeAreaListener yet, so bridge from useSafeAreaInsets instead - the
 * SafeAreaProvider itself is mounted by expo-router's ExpoRoot above us.
 */
function UniwindInsetsBridge() {
  const insets = useSafeAreaInsets()

  useEffect(() => {
    Uniwind.updateInsets(insets)
  }, [insets])

  return null
}

/**
 * App-level data wiring: opens (and migrates) the local SQLite database,
 * exposes it and the three repositories through their contexts, and mounts
 * the TanStack Query client plus the offline-first plumbing: the auth/session
 * provider (with the ownership gate), the sync engine with its opportunistic
 * triggers, and the global conflict-resolution host. Children render only
 * after the database is ready; until then the screen stays empty for the
 * brief local open (~ms).
 */
function AppDataProviders({ children }: { children: React.ReactNode }) {
  const [database, setDatabase] = useState<Awaited<ReturnType<typeof openLocalDatabase>> | null>(
    null,
  )
  const [error, setError] = useState<Error | null>(null)
  const [queryClient] = useState(createQueryClient)

  useEffect(() => {
    let cancelled = false
    openLocalDatabase()
      .then((db) => {
        if (!cancelled) setDatabase(db)
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause : new Error(String(cause)))
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => connectQueryFocusManager(), [])

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text variant="h4" className="text-center text-foreground">
          Не удалось открыть локальную базу данных
        </Text>
        <Text variant="body" className="mt-2 text-center text-muted-foreground">
          {error.message}
        </Text>
      </View>
    )
  }

  if (!database) return null

  return (
    <DatabaseProvider database={database}>
      <QueryClientProvider client={queryClient}>
        <AccountRepositoryProvider repository={createLocalAccountRepository(database)}>
          <CategoryRepositoryProvider repository={createLocalCategoryRepository(database)}>
            <TransactionRepositoryProvider repository={createLocalTransactionRepository(database)}>
              <DebtRepositoryProvider
                debtorRepository={createLocalDebtorRepository(database)}
                debtOperationRepository={createLocalDebtOperationRepository(database)}
              >
                <PlannedPaymentRepositoryProvider
                  repository={createLocalPlannedPaymentRepository(database)}
                >
                  <AuthProvider>
                    <SyncProvider>
                      <ConflictCenter />
                      {/* Second-device household check (household-join D7):
                          renders nothing, may prompt the rebase choice. */}
                      <HouseholdRebaseGuard />
                      {children}
                    </SyncProvider>
                  </AuthProvider>
                </PlannedPaymentRepositoryProvider>
              </DebtRepositoryProvider>
            </TransactionRepositoryProvider>
          </CategoryRepositoryProvider>
        </AccountRepositoryProvider>
      </QueryClientProvider>
    </DatabaseProvider>
  )
}

/**
 * Sync engine composition root (design D7): creates the engine once over
 * the local database and the shared API client, gates runs on
 * authentication (the app is fully usable anonymously; the outbox just
 * waits), bridges the 401 pause/resume with the auth provider, and mounts
 * the opportunistic triggers: foreground, NetInfo reconnect, post-mutation
 * debounce, manual refresh. Lives at the app layer - the FSD composition
 * root - because it composes entity state (auth) with shared
 * infrastructure; lower layers read it via useSyncController from
 * shared/lib/sync/sync-context.
 */
const POST_MUTATION_DEBOUNCE_MS = 2_500

/**
 * Query-key roots backed by the local database (the entity hooks' cache
 * prefixes). A sync cycle that wrote local rows invalidates these - and ONLY
 * these: control-plane queries (household, invite preview) are never served
 * from the local database and must not refetch on sync. Keep in sync with
 * the key roots declared in the entities' model composables.
 */
const LOCAL_DATA_QUERY_KEY_ROOTS = [
  ['transactions'],
  ['accounts'],
  ['categories'],
  ['debtors'],
  ['debt-operations'],
  ['planned-payments'],
] as const

function SyncProvider({ children }: { children: React.ReactNode }) {
  const db = useLocalDatabase()
  const queryClient = useQueryClient()
  const { status: authStatus } = useAuth()

  const [engine] = useState(() =>
    createSyncEngine({
      db,
      transport: createLocalSyncTransport(db),
      onRunComplete: ({ wroteLocalData }) => {
        // The engine is a writer beside the repositories (design D3): every
        // completed cycle refreshes the sync-status cache (the outbox /
        // lastSyncedAt may change even on a failed cycle), while the entity
        // caches refetch only when the cycle actually wrote local rows - a
        // no-op cycle (caught-up pull, offline failure) leaves them alone.
        void queryClient.invalidateQueries({ queryKey: ['sync'] })
        if (wroteLocalData) {
          for (const queryKey of LOCAL_DATA_QUERY_KEY_ROOTS) {
            void queryClient.invalidateQueries({ queryKey: [...queryKey] })
          }
        }
      },
    }),
  )

  const [engineState, setEngineState] = useState<SyncEngineState>(() => engine.getState())
  useEffect(() => engine.subscribe(() => setEngineState(engine.getState())), [engine])

  // OS-scheduled background-fetch trigger (dev build only): best-effort
  // catch-up while the app sits in the background; correctness never
  // depends on it (the triggers below stay primary). Idempotent, fire-and-forget.
  useEffect(() => {
    registerBackgroundSync()
  }, [])

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
      runNow: async () => {
        await engine.run({ force: true })
      },
      presentConflicts,
      registerConflictPresenter,
    }),
    [engine, engineState, presentConflicts, registerConflictPresenter],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

/**
 * The @gorhom modal host must sit INSIDE the data providers: a sheet's form
 * component mounts under this host (not under the screen that opened it), so
 * placing `BottomSheetProvider` above the repositories would cut portaled
 * forms off from their repository/query contexts (conventions forms.md §3).
 */
function AppShellProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppDataProviders>
      <StatusBar style="auto" />
      <UniwindInsetsBridge />
      <BottomSheetProvider>{children}</BottomSheetProvider>
    </AppDataProviders>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppShellProviders>
          <Stack screenOptions={{ headerShown: false, gestureEnabled: true }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            {/* Stack destinations for the Home quick actions. */}
            <Stack.Screen name="income" />
            <Stack.Screen name="debts" />
            {/* Analytics tab detail screens (expense/income breakdown). */}
            <Stack.Screen name="analytics-detail" />
            {/* Invitation accept deep link (household-join design D6). */}
            <Stack.Screen name="invite/[token]" />
          </Stack>
        </AppShellProviders>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
