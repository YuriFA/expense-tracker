import { createI18n } from 'vue-i18n'

import { en } from './locales/en'
import { ru } from './locales/ru'

export const i18n = createI18n({
  legacy: false,
  locale: 'ru',
  fallbackLocale: 'en',
  messages: {
    ru,
    en,
  },
})

export default i18n
