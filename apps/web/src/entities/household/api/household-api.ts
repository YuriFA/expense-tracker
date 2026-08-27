// Typed wrapper over the household control-plane (household-join): membership
// reads and the join/leave lifecycle. Like the session API, this is
// control-plane traffic over the shared apiClient (not synced data - the sync
// engine owns that), so it sits at the same sanctioned seam (invariant #11).
// The underlying calls come from `@expense-tracker/api`; errors reject as
// RepositoryError keyed on the backend code (e.g. HOUSEHOLD_CODE_INVALID) and
// map to messages via `model/household-errors.ts`.

import { apiClient } from '@/shared/api'
import {
  acceptHouseholdInvitation,
  fetchHousehold,
  joinHouseholdByCode,
  leaveHousehold,
  previewHouseholdInvitation,
} from '@expense-tracker/api'

export const householdApi = {
  /** The signed-in user's household (name + members). */
  getHousehold() {
    return fetchHousehold(apiClient)
  },

  /** Acceptor-side invitation preview (matching-email accounts only). */
  previewInvitation(token: string) {
    return previewHouseholdInvitation(apiClient, token)
  },

  /** Accepts an invitation; resolves with the joined household. */
  acceptInvitation(token: string) {
    return acceptHouseholdInvitation(apiClient, token)
  },

  /** Joins the household of an active code; resolves with the joined household. */
  joinByCode(code: string) {
    return joinHouseholdByCode(apiClient, code)
  },

  /**
   * Leaves the household; resolves with the fresh personal household created
   * for the user (the local-data choice then applies to THAT household).
   */
  leave() {
    return leaveHousehold(apiClient)
  },
}
