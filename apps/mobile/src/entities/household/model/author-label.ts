// Authorship label resolution (household-ux design D2): maps a shared
// record's `authorId` (the local row's `userId`) to the member label the
// household members cache provides. The marker rules come from the household
// spec: no marker for own records, records without a known author, or
// single-member households; detail views additionally show provenance
// (the record's "кем записано" line) - pass `selfLabel` and
// `includeSingleMember` there.

import type { HouseholdMember } from '@expense-tracker/api'

export interface AuthorLabelOptions {
  /**
   * Detail views: what an own record shows («вами»). Without it own records
   * render no label anywhere.
   */
  selfLabel?: string
  /**
   * Detail views: keep resolving even when the household has a single member
   * (provenance is about the record, not collaboration).
   */
  includeSingleMember?: boolean
}

/**
 * The label for a record's author, or null when nothing should render:
 * no author, an author missing from the members cache (departed member or
 * pre-authorship record), an own record (unless `selfLabel`), or a
 * single-member household (unless `includeSingleMember`).
 */
export function authorLabel(
  authorId: string | null | undefined,
  members: readonly HouseholdMember[],
  currentUserId: string | null | undefined,
  options?: AuthorLabelOptions,
): string | null {
  if (!authorId) return null
  if (members.length <= 1 && !options?.includeSingleMember) return null

  const author = members.find((member) => member.userId === authorId)
  if (!author) return null
  if (authorId === currentUserId) return options?.selfLabel ?? null
  return author.displayName ?? author.email
}
