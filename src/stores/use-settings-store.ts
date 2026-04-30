import { defineStore } from 'pinia'

import type { Settings } from '@/types/settings'
import { useStorage } from '@vueuse/core'
import { APP_NAME } from '@/constants/config'

const LOCALE_STORAGE_KEY = `${APP_NAME}:locale`
const CURRENCIES_STORAGE_KEY = `${APP_NAME}:currency`
const THEME_STORAGE_KEY = `${APP_NAME}:theme`

const DEFAULT_SETTINGS: Settings = {
  locale: 'en',
  currency: 'USD',
  theme: 'light',
}

export const useSettingsStore = defineStore('settings', () => {
  const locale = useStorage(LOCALE_STORAGE_KEY, DEFAULT_SETTINGS.locale)
  const currency = useStorage(CURRENCIES_STORAGE_KEY, DEFAULT_SETTINGS.currency)
  const theme = useStorage(THEME_STORAGE_KEY, DEFAULT_SETTINGS.theme)

  const setLocale = (value: Settings['locale']) => {
    locale.value = value
  }

  const setCurrency = (value: Settings['currency']) => {
    currency.value = value
  }

  const setTheme = (value: Settings['theme']) => {
    theme.value = value
  }

  return { locale, currency, theme, setLocale, setCurrency, setTheme }
})
