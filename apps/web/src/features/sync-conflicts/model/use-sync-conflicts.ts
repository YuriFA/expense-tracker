import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { LocalSyncConflict } from '@expense-tracker/local-data'
import { getLocalDbApi } from '@/shared/lib/local-db'
import { useSyncController } from '@/shared/lib/local-db'

/** Unresolved conflict records; refetched by the engine's data-changed invalidation. */
export const useUnresolvedConflicts = () =>
  useQuery({
    key: () => ['sync', 'conflicts'],
    query: () => getLocalDbApi().then((api) => api.sync.listUnresolvedConflicts()),
  })

export type ConflictAction = 'keep-local' | 'take-server' | 'dismiss'

/**
 * Resolves a conflict over the RPC bridge and refreshes everything: the
 * resolution rewrites local records, and the follow-up engine run re-pushes
 * keep-local choices / drains confirmed state.
 */
export const useResolveConflict = () => {
  const queryCache = useQueryCache()
  const { runNow } = useSyncController()

  return useMutation({
    mutation: ({ action, conflictId }: { action: ConflictAction; conflictId: string }) =>
      getLocalDbApi().then(async (api) => {
        if (action === 'keep-local') await api.sync.resolveConflictKeepLocal(conflictId)
        else if (action === 'take-server') await api.sync.resolveConflictTakeServer(conflictId)
        else await api.sync.markConflictResolved(conflictId)
      }),
    onSettled: () => {
      void queryCache.invalidateQueries()
      runNow()
    },
  })
}

/** Human label of the conflicting record (name / description), mobile parity. */
export function conflictSubject(conflict: LocalSyncConflict): string {
  const state = conflict.localState as Record<string, unknown> | null
  const source =
    state ?? (conflict.serverState?.data as Record<string, unknown> | undefined) ?? undefined
  const name = typeof source?.name === 'string' ? source.name : ''
  const description = typeof source?.description === 'string' ? source.description : ''
  return name || description
}
