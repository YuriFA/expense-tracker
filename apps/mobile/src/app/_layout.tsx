import '../../global.css'
import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import { Uniwind } from 'uniwind'
import { View } from 'react-native'
import { ThemeProvider } from '@/shared/config/theme'
import { BottomSheetProvider } from '@/shared/ui/bottom-sheet/bottom-sheet-provider'
import { Text } from '@/shared/ui/text'
import { DatabaseProvider } from '@/shared/lib/db/database-context'
import { openLocalDatabase } from '@/shared/lib/db/database'
import { connectQueryFocusManager, createQueryClient } from '@/shared/lib/query/query-client'
import { AuthProvider } from '@/entities/session'
import { createLocalAccountRepository } from '@/entities/account/api/local-repository'
import { AccountRepositoryProvider } from '@/entities/account/api/repository'
import { createLocalCategoryRepository } from '@/entities/category/api/local-repository'
import { CategoryRepositoryProvider } from '@/entities/category/api/repository'
import { createLocalTransactionRepository } from '@/entities/transaction/api/local-repository'
import { TransactionRepositoryProvider } from '@/entities/transaction/api/repository'
import { SyncProvider } from '@/shared/lib/sync/sync-provider'
import { ConflictCenter } from '@/features/sync-conflicts'

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
              <AuthProvider>
                <SyncProvider>
                  <ConflictCenter />
                  {children}
                </SyncProvider>
              </AuthProvider>
            </TransactionRepositoryProvider>
          </CategoryRepositoryProvider>
        </AccountRepositoryProvider>
      </QueryClientProvider>
    </DatabaseProvider>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <BottomSheetProvider>
          <AppDataProviders>
            <StatusBar style="auto" />
            <UniwindInsetsBridge />
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              {/* Placeholder destinations for the Home quick actions. */}
              <Stack.Screen name="income" options={{ headerShown: false }} />
              <Stack.Screen name="goals" options={{ headerShown: false }} />
            </Stack>
          </AppDataProviders>
        </BottomSheetProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
