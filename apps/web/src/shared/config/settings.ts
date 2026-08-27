import { DEFAULT_LOCALE, type AppLocale } from './locale'

export interface Settings {
  locale: AppLocale
  theme: 'light' | 'dark'
}

export const DEFAULT_SETTINGS: Settings = {
  locale: DEFAULT_LOCALE,
  theme: 'light',
}
