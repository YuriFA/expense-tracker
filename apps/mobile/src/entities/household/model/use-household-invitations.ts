import { useQuery } from '@tanstack/react-query'
import { householdApi } from '../api/household-api'

/**
 * The household's outgoing invitations (owner-only listing, household-ux).
 * Callers gate `enabled` on both auth and the owner role; the hook stays
 * role-free so the entity slice never crosses into the session slice.
 */
export function useHouseholdInvitations(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['household', 'invitations'],
    queryFn: () => householdApi.listInvitations(),
    enabled: options?.enabled,
  })
}
