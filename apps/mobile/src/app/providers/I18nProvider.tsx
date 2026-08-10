import { PropsWithChildren } from 'react'
import { I18nextProvider } from 'react-i18next'
import { initI18n, i18next } from '@shared/lib/i18n'

/**
 * Wraps the tree with the i18next instance, initialized against the shared
 * message bundles (`@expense-tracker/i18n`). Runtime language switches are
 * driven from the settings store (`changeLanguage`), so no restart is needed.
 */
export function I18nProvider({ children }: PropsWithChildren) {
  // Initialize once (idempotent); safe during render because init is gated on
  // `isInitialized` and resolves synchronously into the resources map.
  initI18n()
  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>
}
