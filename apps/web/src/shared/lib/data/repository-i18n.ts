import i18n from '@/shared/i18n'
import type { RepositoryErrorMessages } from './repository'

export const getRepositoryErrorMessages = (): RepositoryErrorMessages => ({
  notFound: i18n.global.t('errors.notFound'),
  hasReferences: i18n.global.t('errors.hasReferences'),
  invalidPayload: i18n.global.t('errors.invalidPayload'),
  unknownReferences: i18n.global.t('errors.unknownReferences'),
  generic: i18n.global.t('errors.generic'),
})
