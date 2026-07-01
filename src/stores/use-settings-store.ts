import { defineStore } from 'pinia'

import type { Settings } from '@/shared/types/settings'
import { useStorage } from '@vueuse/core'
import { APP_NAME } from '@/app/config'
import { DEFAULT_SETTINGS } from '@/shared/config/settings'

const LOCALE_STORAGE_KEY = `${APP_NAME}:locale`
const CURRENCIES_STORAGE_KEY = `${APP_NAME}:currency`
const THEME_STORAGE_KEY = `${APP_NAME}:theme`

export const useSettingsStore = defineStore('settings', () => {
  const locale = useStorage<Settings['locale']>(LOCALE_STORAGE_KEY, DEFAULT_SETTINGS.locale)
  const currency = useStorage<Settings['currency']>(
    CURRENCIES_STORAGE_KEY,
    DEFAULT_SETTINGS.currency,
  )
  const theme = useStorage<Settings['theme']>(THEME_STORAGE_KEY, DEFAULT_SETTINGS.theme)

  return { locale, currency, theme }
})
