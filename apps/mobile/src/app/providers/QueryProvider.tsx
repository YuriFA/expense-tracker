import { useState, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * TanStack Query (React Query) provider - the RN analog of the web's
 * `@pinia/colada` data layer. Mutations elsewhere do optimistic updates +
 * invalidation against these defaults. Retries are capped so an offline-first
 * write that fails doesn't hammer the (possibly absent) network.
 */
export function QueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // SWR: don't refetch on remount within 30s
            gcTime: 5 * 60_000,
            retry: 2,
            // Don't refetch on reconnect/window focus: local store is the source
            // of truth offline-first; the (optional) HTTP impl invalidates.
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
