import { defineStore } from 'pinia'

import { useStorage } from '@vueuse/core'
import { APP_NAME } from '@/shared/config/app'
import { DEFAULT_SETTINGS, type Settings } from '@/shared/config/settings'

const LOCALE_STORAGE_KEY = `${APP_NAME}:locale`
const THEME_STORAGE_KEY = `${APP_NAME}:theme`

export const useSettingsStore = defineStore('settings', () => {
  const locale = useStorage<Settings['locale']>(LOCALE_STORAGE_KEY, DEFAULT_SETTINGS.locale)
  const theme = useStorage<Settings['theme']>(THEME_STORAGE_KEY, DEFAULT_SETTINGS.theme)

  return { locale, theme }
})
