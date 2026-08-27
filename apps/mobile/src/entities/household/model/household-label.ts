// Household display labels. The display name is optional by contract
// (household-join spec): when absent, interfaces fall back to a label
// derived from the owner's account (ADR-0002 wording: the spec's "derived
// label from the owner's account").

import type { Household } from '@expense-tracker/api'

/** The local part of an email address («wife@example.com» → «wife»). */
export function emailLocalPart(email: string): string {
  const at = email.indexOf('@')
  return at > 0 ? email.slice(0, at) : email
}

/** The household's display name, or the owner's email prefix when unset. */
export function householdDisplayName(household: Household): string {
  if (household.name) return household.name
  const owner = household.members.find((member) => member.role === 'owner')
  const source = owner ?? household.members[0]
  return source ? emailLocalPart(source.email) : 'Домохозяйство'
}
