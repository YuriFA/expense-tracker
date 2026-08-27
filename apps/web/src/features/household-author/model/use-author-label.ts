// Authorship marker context for list rows (household-ux 3.4): resolves a
// record's `authorId` against the household members cache + the current user.
// The entity slices stay cross-import-free; pages compose this tiny feature.

import { computed } from 'vue'
import { authorLabel, useHousehold } from '@/entities/household'
import { useAuthStore } from '@/entities/session'

export function useAuthorLabel() {
  const auth = useAuthStore()
  const householdQuery = useHousehold({ enabled: () => auth.isAuthenticated })
  const members = computed(() => householdQuery.data.value?.members ?? [])

  return (authorId: string | null | undefined): string | null =>
    authorLabel(authorId, members.value, auth.user?.id)
}
