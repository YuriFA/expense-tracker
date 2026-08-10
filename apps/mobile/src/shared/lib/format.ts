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
