import { useQuery } from '@tanstack/react-query'
import { householdApi } from '../api/household-api'

/**
 * The signed-in user's household (control-plane read over the API, not
 * synced data). Callers gate `enabled` on the auth status - the hook stays
 * auth-free so the entity slice never crosses into the session slice.
 */
export function useHousehold(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['household'],
    queryFn: () => householdApi.getHousehold(),
    enabled: options?.enabled,
  })
}
