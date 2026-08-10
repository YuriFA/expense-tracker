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
 * Format an ISO 8601 datetime as a compact locale-aware calendar date (e.g.
 * "Apr 5"). The year is included only for dates outside the current year so
 * the recent-history list stays dense. Returns an empty string for an
 * unparseable value.
 */
export function formatDate(isoDateTime: string, locale: AppLocale): string {
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) return ''
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString(intlLocale[locale], {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
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
