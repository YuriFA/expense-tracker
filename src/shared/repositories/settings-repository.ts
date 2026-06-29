import type { Settings } from '../types/settings'

export interface SettingsRepository {
  getLocale(): Promise<Settings['locale']>
  setLocale(locale: Settings['locale']): Promise<void>

  getCurrency(): Promise<Settings['currency']>
  setCurrency(currency: Settings['currency']): Promise<void>

  getTheme(): Promise<Settings['theme']>
  setTheme(theme: Settings['theme']): Promise<void>
}
