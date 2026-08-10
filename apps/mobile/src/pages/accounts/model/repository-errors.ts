import type { TFunction } from 'i18next'
import type { RepositoryErrorMessages } from '@expense-tracker/api'

/**
 * Build the localized repository-error message map for the account CRUD flows.
 * The shared `getRepositoryErrorMessage` switches on the typed error `code`; we
 * only supply the per-code strings here. Reused by the add / edit / delete
 * sheets so the mapping lives in one place within this slice.
 */
export function accountRepositoryErrorMessages(t: TFunction): RepositoryErrorMessages {
  return {
    notFound: t('errors.notFound'),
    hasReferences: t('errors.hasReferences'),
    invalidPayload: t('errors.invalidPayload'),
    unknownReferences: t('errors.unknownReferences'),
    versionConflict: t('errors.versionConflict'),
    alreadyExists: t('errors.alreadyExists'),
    unauthorized: t('errors.unauthorized'),
    rateLimited: t('errors.rateLimited'),
    conflict: t('errors.conflict'),
    generic: t('errors.generic'),
  }
}
