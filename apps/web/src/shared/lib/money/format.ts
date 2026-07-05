import { toDecimal } from 'dinero.js'
import type { CurrencyCode } from './currencies'
import { toMoney } from './money'

export function formatMoney(amountMinor: number, currency: CurrencyCode, locale: string): string {
  const money = toMoney(amountMinor, currency)
  const value = Number(toDecimal(money))

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(value)
}
