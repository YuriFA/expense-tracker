import { createI18n } from 'vue-i18n'

import { en } from './locales/en'
import { ru } from './locales/ru'
import { DEFAULT_LOCALE } from '@/shared/config/locale'

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: 'en',
  messages: {
    ru,
    en,
  },
})

export default i18n
