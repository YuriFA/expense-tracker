import type { TFunction } from 'i18next'
import type { RepositoryErrorMessages } from '@expense-tracker/api'

/**
 * Localized repository-error message map for the Settings CRUD flows
 * (category create / edit / delete). The shared `getRepositoryErrorMessage`
 * switches on the typed error `code`; this supplies the per-code strings.
 */
export function categoryRepositoryErrorMessages(t: TFunction): RepositoryErrorMessages {
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
