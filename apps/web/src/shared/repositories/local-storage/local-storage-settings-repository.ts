import { useStorage } from '@vueuse/core'
import type { Settings } from '@/shared/types/settings'
import type { SettingsRepository } from '../settings-repository'
import { STORAGE_KEYS } from './storage-keys'

import { DEFAULT_SETTINGS } from '@/shared/config/settings'

export interface LocalStorageSettingsRefs {
  locale: ReturnType<typeof useStorage<Settings['locale']>>
  currency: ReturnType<typeof useStorage<Settings['currency']>>
  theme: ReturnType<typeof useStorage<Settings['theme']>>
}

export function createLocalStorageSettingsRepository(): SettingsRepository & {
  asRefs(): LocalStorageSettingsRefs
} {
  const locale = useStorage<Settings['locale']>(
    STORAGE_KEYS.settings.locale,
    DEFAULT_SETTINGS.locale,
  )
  const currency = useStorage<Settings['currency']>(
    STORAGE_KEYS.settings.currency,
    DEFAULT_SETTINGS.currency,
  )
  const theme = useStorage<Settings['theme']>(STORAGE_KEYS.settings.theme, DEFAULT_SETTINGS.theme)

  return {
    asRefs() {
      return { locale, currency, theme }
    },
    async getLocale() {
      return locale.value
    },
    async setLocale(value) {
      locale.value = value
    },
    async getCurrency() {
      return currency.value
    },
    async setCurrency(value) {
      currency.value = value
    },
    async getTheme() {
      return theme.value
    },
    async setTheme(value) {
      theme.value = value
    },
  }
}
