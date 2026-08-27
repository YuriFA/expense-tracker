// Household apiCode → message mapping (household-join). The backend signals
// the join lifecycle through machine codes on RepositoryError.apiCode (e.g.
// HOUSEHOLD_INVITATION_EXPIRED); the generic repository messages cannot tell
// them apart, so this module owns the household-specific RU/EN copy keyed by
// apiCode. Every message goes through the shared i18n bundles - callers get
// `null` for non-household errors and fall back to the generic mapping.

import i18n from '@/shared/i18n'
import { RepositoryError } from '@/shared/lib/data'

/** Backend machine codes of the household join/leave lifecycle. */
export type HouseholdApiErrorCode =
  | 'HOUSEHOLD_INVITATION_EMAIL_MISMATCH'
  | 'HOUSEHOLD_INVITATION_EXPIRED'
  | 'HOUSEHOLD_INVITATION_REVOKED'
  | 'HOUSEHOLD_INVITATION_ALREADY_ACCEPTED'
  | 'HOUSEHOLD_INVITATION_NOT_FOUND'
  | 'HOUSEHOLD_CODE_INVALID'
  | 'HOUSEHOLD_OWNER_WITH_MEMBERS'

const HOUSEHOLD_API_ERROR_CODES = new Set<string>([
  'HOUSEHOLD_INVITATION_EMAIL_MISMATCH',
  'HOUSEHOLD_INVITATION_EXPIRED',
  'HOUSEHOLD_INVITATION_REVOKED',
  'HOUSEHOLD_INVITATION_ALREADY_ACCEPTED',
  'HOUSEHOLD_INVITATION_NOT_FOUND',
  'HOUSEHOLD_CODE_INVALID',
  'HOUSEHOLD_OWNER_WITH_MEMBERS',
])

/** The error's household apiCode, or null for anything else. */
export function getHouseholdApiErrorCode(error: unknown): HouseholdApiErrorCode | null {
  if (!(error instanceof RepositoryError)) return null
  const code = error.apiCode
  return code !== undefined && HOUSEHOLD_API_ERROR_CODES.has(code)
    ? (code as HouseholdApiErrorCode)
    : null
}

/** The localized message for a household apiCode error; null when not one. */
export function getHouseholdErrorMessage(error: unknown): string | null {
  switch (getHouseholdApiErrorCode(error)) {
    case 'HOUSEHOLD_INVITATION_EMAIL_MISMATCH':
      return i18n.global.t('household.errors.emailMismatch')
    case 'HOUSEHOLD_INVITATION_EXPIRED':
      return i18n.global.t('household.errors.invitationExpired')
    case 'HOUSEHOLD_INVITATION_REVOKED':
      return i18n.global.t('household.errors.invitationRevoked')
    case 'HOUSEHOLD_INVITATION_ALREADY_ACCEPTED':
      return i18n.global.t('household.errors.invitationAlreadyAccepted')
    case 'HOUSEHOLD_INVITATION_NOT_FOUND':
      return i18n.global.t('household.errors.invitationNotFound')
    case 'HOUSEHOLD_CODE_INVALID':
      return i18n.global.t('household.errors.codeInvalid')
    case 'HOUSEHOLD_OWNER_WITH_MEMBERS':
      return i18n.global.t('household.errors.ownerWithMembers')
    default:
      return null
  }
}
