import { DEFAULT_LOCALE, type AppLocale } from './locale'

export interface Settings {
  locale: AppLocale
  /**
   * `system` follows the OS `prefers-color-scheme` preference live
   * (bridged by `app/theme.ts`).
   */
  theme: 'light' | 'dark' | 'system'
}

export const DEFAULT_SETTINGS: Settings = {
  locale: DEFAULT_LOCALE,
  theme: 'light',
}
