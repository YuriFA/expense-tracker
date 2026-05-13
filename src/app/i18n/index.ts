import { createI18n } from 'vue-i18n'

import en from './locales/en.json'
import ru from './locales/ru.json'
import type { AppLocale, MessageSchema } from './schema'
import { DEFAULT_LOCALE } from '@/shared/config/locale'

export const i18n = createI18n<MessageSchema, AppLocale, false>({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: 'en',
  messages: {
    ru,
    en,
  },
})

export default i18n
