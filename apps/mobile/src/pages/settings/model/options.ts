import { AVAILABLE_CURRENCIES, type CurrencyCode } from '@expense-tracker/money'
import type { AppLocale } from '@expense-tracker/i18n'
import { currencySymbol, currencyName } from '@shared/lib/format'

/** A single selectable option in a settings picker. */
export interface OptionEntry<T extends string> {
  value: T
  /** Primary, user-facing label. */
  label: string
  /** Optional secondary line (code + symbol for currencies). */
  description?: string
}

/**
 * Each language rendered as its own autonym - the universal language-picker
 * convention (the label does NOT change with the active locale, so a Russian
 * speaker can always find "Русский"). Static because the locale set is fixed.
 */
export const LANGUAGE_OPTIONS: ReadonlyArray<OptionEntry<AppLocale>> = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
]

/**
 * Currency options localized for the active locale: the display name (e.g.
 * "US Dollar" / "Доллар США") as the primary label and the ISO code plus narrow
 * symbol ("USD · $") as the secondary line. Names come from a static map so
 * adding a currency needs no edit to a runtime `Intl` lookup.
 */
export function currencyOptions(
  locale: AppLocale,
): ReadonlyArray<OptionEntry<CurrencyCode>> {
  return AVAILABLE_CURRENCIES.map((code) => ({
    value: code,
    label: currencyName(code, locale),
    description: `${code} · ${currencySymbol(code)}`,
  }))
}
