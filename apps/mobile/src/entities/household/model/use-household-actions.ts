import { useMutation, useQueryClient } from '@tanstack/react-query'
import { householdApi } from '../api/household-api'

/**
 * The household management mutation set (household-ux design D1): typed
 * actions over the control-plane API, each invalidating the household caches
 * (the `['household']` prefix also matches `['household', 'invitations']`)
 * on settle so the section reflects the server's answer. No dedicated store -
 * the query cache plus these mutations are the whole state.
 */
export function useHouseholdActions() {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['household'] })
  }

  const rename = useMutation({
    mutationFn: (name: string | null) => householdApi.rename(name),
    onSettled: invalidate,
  })

  const updateDisplayName = useMutation({
    mutationFn: (displayName: string) => householdApi.updateDisplayName(displayName),
    onSettled: invalidate,
  })

  const invite = useMutation({
    mutationFn: (email: string) => householdApi.invite(email),
    onSettled: invalidate,
  })

  const revokeInvitation = useMutation({
    mutationFn: (invitationId: string) => householdApi.revokeInvitation(invitationId),
    onSettled: invalidate,
  })

  const generateCode = useMutation({
    mutationFn: () => householdApi.generateCode(),
    onSettled: invalidate,
  })

  const revokeCode = useMutation({
    mutationFn: () => householdApi.revokeCode(),
    onSettled: invalidate,
  })

  const removeMember = useMutation({
    mutationFn: (userId: string) => householdApi.removeMember(userId),
    onSettled: invalidate,
  })

  const dissolve = useMutation({
    mutationFn: () => householdApi.dissolve(),
    onSettled: invalidate,
  })

  return {
    rename,
    updateDisplayName,
    invite,
    revokeInvitation,
    generateCode,
    revokeCode,
    removeMember,
    dissolve,
  }
}
