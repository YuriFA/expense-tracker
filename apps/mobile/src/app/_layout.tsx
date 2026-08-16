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
import { openLocalDatabase } from '@/shared/lib/db/database'
import { connectQueryFocusManager, createQueryClient } from '@/shared/lib/query/query-client'
import { createLocalAccountRepository } from '@/entities/account/api/local-repository'
import { AccountRepositoryProvider } from '@/entities/account/api/repository'
import { createLocalCategoryRepository } from '@/entities/category/api/local-repository'
import { CategoryRepositoryProvider } from '@/entities/category/api/repository'
import { createLocalTransactionRepository } from '@/entities/transaction/api/local-repository'
import { TransactionRepositoryProvider } from '@/entities/transaction/api/repository'

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

interface LocalRepositories {
  accounts: ReturnType<typeof createLocalAccountRepository>
  categories: ReturnType<typeof createLocalCategoryRepository>
  transactions: ReturnType<typeof createLocalTransactionRepository>
}

/**
 * App-level data wiring: opens (and migrates) the local SQLite database,
 * exposes the three repositories through their contexts, and mounts the
 * TanStack Query client. Children render only after the database is ready;
 * until then the screen stays empty for the brief local open (~ms).
 *
 * TODO(auth): add the session gate - render `(auth)` for unauthenticated
 * users and `(tabs)` once authenticated, mirroring the web router guard at
 * apps/web/src/app/router.
 */
function AppDataProviders({ children }: { children: React.ReactNode }) {
  const [repositories, setRepositories] = useState<LocalRepositories | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [queryClient] = useState(createQueryClient)

  useEffect(() => {
    let cancelled = false
    openLocalDatabase()
      .then((db) => {
        if (cancelled) return
        setRepositories({
          accounts: createLocalAccountRepository(db),
          categories: createLocalCategoryRepository(db),
          transactions: createLocalTransactionRepository(db),
        })
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

  if (!repositories) return null

  return (
    <QueryClientProvider client={queryClient}>
      <AccountRepositoryProvider repository={repositories.accounts}>
        <CategoryRepositoryProvider repository={repositories.categories}>
          <TransactionRepositoryProvider repository={repositories.transactions}>
            {children}
          </TransactionRepositoryProvider>
        </CategoryRepositoryProvider>
      </AccountRepositoryProvider>
    </QueryClientProvider>
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
