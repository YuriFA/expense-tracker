import { formatMoney, type CurrencyCode } from '@expense-tracker/money'
import type { AppLocale } from '@expense-tracker/i18n'

/** Map an app locale to an Intl locale string accepted by `Intl.NumberFormat`. */
const intlLocale: Record<AppLocale, string> = {
  en: 'en-US',
  ru: 'ru-RU',
}

/**
 * Format a minor-units amount for display. Delegates to the shared
 * `@expense-tracker/money` formatter (locale + currency aware, no floats).
 */
export function formatAmount(
  amountMinor: number,
  currency: CurrencyCode,
  locale: AppLocale,
): string {
  return formatMoney(amountMinor, currency, intlLocale[locale])
}

/**
 * The narrow currency symbol ("$", "€", "₽") for display next to an amount.
 * Derived from `Intl` so it stays locale- and currency-aware with no hard-coded
 * map; falls back to the ISO code if the formatter offers no symbol part.
 */
export function currencySymbol(currency: CurrencyCode, locale: AppLocale): string {
  const parts = new Intl.NumberFormat(intlLocale[locale], {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).formatToParts(0)
  return parts.find((part) => part.type === 'currency')?.value ?? currency
}
