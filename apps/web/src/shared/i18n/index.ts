import { createI18n } from 'vue-i18n'

import { messages, type MessageSchema, DEFAULT_LOCALE, type AppLocale } from '@expense-tracker/i18n'

const i18n = createI18n<MessageSchema, AppLocale, false>({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: 'en',
  messages,
})

export default i18n
