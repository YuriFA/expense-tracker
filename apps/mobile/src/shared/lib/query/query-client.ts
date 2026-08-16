// TanStack Query wiring. The query cache is a UI cache over the local
// repositories - explicitly NOT the offline store (design D3); all writers
// (repositories today, the sync engine later) invalidate the entity keys
// after writing.

import { QueryClient, focusManager } from '@tanstack/react-query'
import { AppState, type AppStateStatus } from 'react-native'

/**
 * Builds the app's single QueryClient. Local reads are cheap, so a short
 * staleTime simply avoids re-querying SQLite on every focus; mutations
 * invalidate the relevant keys explicitly.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 15_000, retry: 1 },
    },
  })
}

/** Maps React Native app-state changes onto TanStack Query's focus manager.
 * Returns an unsubscribe function (for useEffect cleanup). */
export function connectQueryFocusManager(): () => void {
  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    focusManager.setFocused(status === 'active')
  })
  return () => subscription.remove()
}
