import { formatMoney, type CurrencyCode } from '@expense-tracker/money'
import type { AppLocale } from '@expense-tracker/i18n'

/** Map an app locale to the BCP-47 tag the shared money formatter expects. */
const bcp47Locale: Record<AppLocale, string> = {
  en: 'en-US',
  ru: 'ru-RU',
}

/** Narrow currency symbol for the supported currencies; ISO code fallback. */
const CURRENCY_SYMBOLS: Partial<Record<CurrencyCode, string>> = {
  USD: '$',
  EUR: '€',
  RUB: '₽',
}

/** Localized currency display name for the Settings picker and a11y labels. */
const CURRENCY_NAMES: Record<AppLocale, Partial<Record<CurrencyCode, string>>> = {
  en: { USD: 'US Dollar', EUR: 'Euro', RUB: 'Russian Ruble' },
  ru: { USD: 'Доллар США', EUR: 'Евро', RUB: 'Российский рубль' },
}

/** Localized month names (Date.getMonth() index, 0-11) for date formatting. */
const MONTHS: Record<AppLocale, { short: string[]; long: string[] }> = {
  en: {
    short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    long: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
  },
  // Russian dates place the month after the day, so the genitive case is used
  // ("5 апреля"); the short list mirrors the abbreviated genitive forms.
  ru: {
    short: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
    long: [
      'января',
      'февраля',
      'марта',
      'апреля',
      'мая',
      'июня',
      'июля',
      'августа',
      'сентября',
      'октября',
      'ноября',
      'декабря',
    ],
  },
}

/** Localized weekday abbreviations (Date.getDay() index, 0=Sunday..6=Saturday). */
const WEEKDAYS: Record<AppLocale, string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
}

/**
 * Format a minor-units amount for display. Delegates to the shared
 * `@expense-tracker/money` formatter (locale + currency aware, no floats, no
 * `Intl`).
 */
export function formatAmount(
  amountMinor: number,
  currency: CurrencyCode,
  locale: AppLocale,
): string {
  return formatMoney(amountMinor, currency, bcp47Locale[locale])
}

/**
 * Format an ISO 8601 datetime as a compact locale-aware calendar date (e.g.
 * en "Apr 5", ru "5 апр"). The year is included only for dates outside the
 * current year so the recent-history list stays dense. Returns an empty string
 * for an unparseable value.
 */
export function formatDate(isoDateTime: string, locale: AppLocale): string {
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) return ''

  const month = MONTHS[locale].short[date.getMonth()] ?? ''
  const day = date.getDate()
  const core = locale === 'ru' ? `${day} ${month}` : `${month} ${day}`

  return date.getFullYear() === new Date().getFullYear()
    ? core
    : `${core} ${date.getFullYear()}`
}

/**
 * Format a date for the home header: weekday + long month + day (e.g. en
 * "Mon, January 5", ru "Пн 5 января"). `Intl`-free.
 */
export function formatHeaderDate(date: Date, locale: AppLocale): string {
  const weekday = WEEKDAYS[locale][date.getDay()] ?? ''
  const month = MONTHS[locale].long[date.getMonth()] ?? ''
  const day = date.getDate()

  return locale === 'ru' ? `${weekday} ${day} ${month}` : `${weekday}, ${month} ${day}`
}

/**
 * Short weekday abbreviation (e.g. en "Mon", ru "Пн") for compact date chips.
 * `Intl`-free; indexed by `Date.getDay()` (0=Sunday..6=Saturday).
 */
export function formatWeekdayShort(date: Date, locale: AppLocale): string {
  return WEEKDAYS[locale][date.getDay()] ?? ''
}

/**
 * The day-of-month as a string (e.g. "5", "23") for compact date chips.
 */
export function formatDayNumber(date: Date): string {
  return String(date.getDate())
}

/**
 * The narrow currency symbol ("$", "€", "₽") for display next to an amount.
 * A static map keeps it deterministic and `Intl`-free (Hermes-safe); unknown
 * currencies fall back to their ISO code.
 */
export function currencySymbol(currency: CurrencyCode): string {
  return CURRENCY_SYMBOLS[currency] ?? currency
}

/**
 * The localized currency display name (e.g. "US Dollar" / "Доллар США") for the
 * Settings currency picker and VoiceOver/TalkBack labels. Static map, no
 * `Intl`; falls back to the narrow symbol.
 */
export function currencyName(currency: CurrencyCode, locale: AppLocale): string {
  return CURRENCY_NAMES[locale][currency] ?? currencySymbol(currency)
}
