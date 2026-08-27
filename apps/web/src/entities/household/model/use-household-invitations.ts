import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { householdApi } from '../api/household-api'

/**
 * The household's outgoing invitations (owner-only listing, household-ux).
 * Callers gate `enabled` on both auth and the owner role; the composable
 * stays role-free so the entity slice never crosses into the session slice.
 */
export function useHouseholdInvitations(options?: { enabled?: MaybeRefOrGetter<boolean> }) {
  return useQuery({
    key: () => ['household', 'invitations'],
    query: () => householdApi.listInvitations(),
    enabled: () => (options?.enabled === undefined ? true : toValue(options.enabled)),
  })
}
