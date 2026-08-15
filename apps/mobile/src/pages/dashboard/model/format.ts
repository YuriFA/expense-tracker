// Display formatting for the Home mock: RU locale, single currency (RUB).
// Uses the shared money package (integer minor units, Intl-free) so the
// screen already formats through @expense-tracker/money instead of float
// math - the formatting layer stays when mocks are replaced by the API.

import { formatMoney, type CurrencyCode } from '@expense-tracker/money'

const MOCK_CURRENCY: CurrencyCode = 'RUB'
const RU_LOCALE = 'ru'

/**
 * Compact amount for the reference look: "26 813 ₽" instead of the money
 * package's always-two-digits "26 813,00 ₽". Only the Home mock prefers
 * the compact form.
 */
export function formatAmount(amountMinor: number): string {
  const formatted = formatMoney(amountMinor, MOCK_CURRENCY, RU_LOCALE)
  return formatted.replace(/,00(?=\u00A0)/, '')
}

// TODO(i18n): RU strings below are hardcoded until react-i18next is wired;
// move them into the shared @expense-tracker/i18n bundle then.

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

/** Reference-style period label: "1 АВГ. — 31 АВГ.". */
export function monthRangeLabel(year: number, month: number): string {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return `1 ${MONTH_ABBR[month]} — ${lastDay} ${MONTH_ABBR[month]}`
}

/** "Сегодня" / "Вчера" / "14 АВГ." relative to `now` (local time). */
export function relativeDayLabel(occurredAt: string, now: Date = new Date()): string {
  const d = new Date(occurredAt)
  const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((midnight(now) - midnight(d)) / 86_400_000)
  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`
}
