import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { householdApi } from '../api/household-api'

/**
 * The signed-in user's household (control-plane read over the API, not
 * synced data). Callers gate `enabled` on the auth status - the composable
 * stays auth-free so the entity slice never crosses into the session slice.
 */
export function useHousehold(options?: { enabled?: MaybeRefOrGetter<boolean> }) {
  return useQuery({
    key: () => ['household'],
    query: () => householdApi.getHousehold(),
    enabled: () => (options?.enabled === undefined ? true : toValue(options.enabled)),
  })
}
