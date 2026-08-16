// RU error messages for the shared repository error model. Mobile has no
// react-i18next wiring yet (AGENTS.md: i18n is a pending concern), so these
// mirror the wording of the shared @expense-tracker/i18n RU bundle as a
// static map - the web app's repository-i18n.ts is the twin of this file.
// When mobile i18n lands, this module becomes a thin t() adapter.

import { getRepositoryErrorMessage, type RepositoryErrorMessages } from '@expense-tracker/api'

const REPOSITORY_ERRORS_RU: RepositoryErrorMessages = {
  notFound: 'Не найдено',
  hasReferences: 'Невозможно удалить, так как есть связанные транзакции',
  invalidPayload: 'Некорректные данные',
  unknownReferences: 'Указан неизвестный счёт или категория',
  versionConflict: 'Изменено другим действием. Обновите и повторите',
  alreadyExists: 'Уже существует',
  unauthorized: 'Необходимо войти',
  rateLimited: 'Слишком много попыток. Попробуйте позже',
  conflict: 'Действие конфликтует с текущим состоянием',
  generic: 'Что-то пошло не так',
}

/** Human-readable RU message for any repository error (code-keyed). */
export function getRepositoryErrorText(error: unknown): string {
  return getRepositoryErrorMessage(error, REPOSITORY_ERRORS_RU)
}
