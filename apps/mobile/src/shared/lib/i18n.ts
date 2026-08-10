import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { messages, DEFAULT_LOCALE } from '@expense-tracker/i18n'

/**
 * i18next wired to the shared message bundles from `@expense-tracker/i18n`.
 * The message-key set is identical to the web app (EN/RU); default-category
 * localization flows through the shared `mapCategories` helper, which takes a
 * translator function so this package stays framework-agnostic.
 *
 * Initialized once at module load; language switches happen at runtime via
 * `i18next.changeLanguage()` (driven from the settings store) - no restart.
 */
export function initI18n(): typeof i18next {
  if (i18next.isInitialized) {
    return i18next
  }

  void i18next.use(initReactI18next).init({
    resources: {
      en: { translation: messages.en },
      ru: { translation: messages.ru },
    },
    lng: DEFAULT_LOCALE,
    fallbackLng: 'en',
    interpolation: {
      // react-i18next escapes by default; our bundles are static strings.
      escapeValue: false,
    },
    returnNull: false,
  })

  return i18next
}

export { i18next }
