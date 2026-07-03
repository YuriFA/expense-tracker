import { DEFAULT_CURRENCY } from './currencies'
import { DEFAULT_LOCALE, type AppLocale } from './locale'

export interface Settings {
  locale: AppLocale
  currency: string
  theme: 'light' | 'dark'
}

export const DEFAULT_SETTINGS: Settings = {
  locale: DEFAULT_LOCALE,
  currency: DEFAULT_CURRENCY,
  theme: 'light',
}
