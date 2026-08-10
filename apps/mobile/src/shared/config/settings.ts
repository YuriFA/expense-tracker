import type { CurrencyCode } from '@expense-tracker/money'
import type { AppLocale } from '@expense-tracker/i18n'

/**
 * The user-tunable settings persisted across launches. Mirror of the web
 * settings model; locale + currency + theme are the only knobs at this stage.
 *
 * The mobile theme adds `'system'` (follow the OS appearance) on top of the
 * web's light/dark, per the mobile design ("system / light / dark").
 */
export interface Settings {
  locale: AppLocale
  currency: CurrencyCode
  theme: ThemePreference
}

/**
 * Resolved (effective) theme after applying the `'system'` preference against
 * the OS color scheme. This is what the theme context exposes to components.
 */
export type ResolvedTheme = 'light' | 'dark'

/** What the user picks in Settings. */
export type ThemePreference = 'system' | 'light' | 'dark'

export const DEFAULT_SETTINGS: Settings = {
  locale: 'en',
  currency: 'USD',
  theme: 'system',
}
