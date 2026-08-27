import { useQuery } from '@pinia/colada'
import { useAuthStore } from '@/entities/session'
import { getLocalDbApi } from '@/shared/lib/local-db'

/** Sync status snapshot (pending outbox + unresolved conflicts), polled as a
 * query invalidated by the engine's data-changed signal; disabled while
 * anonymous (nothing to sync - local mode). */
export const useSyncStatus = () => {
  const auth = useAuthStore()
  return useQuery({
    key: () => ['sync', 'status'],
    query: () => getLocalDbApi().then((api) => api.sync.readStatus()),
    enabled: () => auth.isAuthenticated,
  })
}
