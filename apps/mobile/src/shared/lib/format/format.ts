// Display formatting shared by the dashboard and the transactions tab: RU
// locale, single-currency amounts via @expense-tracker/money (integer minor
// units, Intl-free), and period/day labels.

import { formatMoney, type CurrencyCode } from '@expense-tracker/money'

export const DEFAULT_CURRENCY: CurrencyCode = 'RUB'
const RU_LOCALE = 'ru'

// TODO(i18n): RU strings below are hardcoded until react-i18next is wired;
// move them into the shared @expense-tracker/i18n bundle then.

/**
 * Compact amount for the reference look: "26 813 ₽" instead of the money
 * package's always-two-digits "26 813,00 ₽".
 */
export function formatAmount(amountMinor: number): string {
  const formatted = formatMoney(amountMinor, DEFAULT_CURRENCY, RU_LOCALE)
  return formatted.replace(/,00(?=\u00A0)/, '')
}

const MONTH_ABBR = [
  'ЯНВ.',
  'ФЕВ.',
  'МАР.',
  'АПР.',
  'МАЯ',
  'ИЮН.',
  'ИЮЛ.',
  'АВГ.',
  'СЕН.',
  'ОКТ.',
  'НОЯ.',
  'ДЕК.',
] as const

/** Nominative full month names for calendar headers: "Август". */
export const MONTH_FULL = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
] as const

/** Reference-style period label: "1 АВГ. — 31 АВГ.". */
export function monthRangeLabel(year: number, month: number): string {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return `1 ${MONTH_ABBR[month]} — ${lastDay} ${MONTH_ABBR[month]}`
}

/** Whole calendar days between `occurredAt` and `now` (local midnights); negative = future. */
export function calendarDaysAgo(occurredAt: string, now: Date = new Date()): number {
  const d = new Date(occurredAt)
  const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  return Math.round((midnight(now) - midnight(d)) / 86_400_000)
}

/** "Сегодня" / "Вчера" / "14 АВГ." relative to `now` (local time). */
export function relativeDayLabel(occurredAt: string, now: Date = new Date()): string {
  const diffDays = calendarDaysAgo(occurredAt, now)
  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  const d = new Date(occurredAt)
  return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`
}

// TODO(i18n): RU plural forms until mobile i18n wiring lands.
/** "2 дня назад" / "5 дней назад" for whole days ago (2+). */
export function daysAgoLabel(days: number): string {
  const mod10 = days % 10
  const mod100 = days % 100
  const plural = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'дня' : 'дней'
  return `${days} ${plural} назад`
}
