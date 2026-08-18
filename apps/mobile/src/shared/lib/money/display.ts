// Live display of the keypad-owned amount string ("125", "125,5", "125,50",
// transient "125,"), grouped and suffixed with the currency symbol. The
// always-two-digits `formatMoney` is wrong for this: it must not pad or
// normalize digits the user is still typing. No float math - string only.

import { currencySymbol, type CurrencyCode } from '@expense-tracker/money'

const GROUP_SEPARATOR = '\u202F'
const SYMBOL_SEPARATOR = '\u00A0'

/** Groups the integer part of a keypad amount and appends the currency symbol: "1 250,5 ₽". */
export function formatAmountInput(value: string, currency: CurrencyCode): string {
  const [integer = '0', fraction] = value.split(',')
  const digits = integer === '' ? '0' : integer.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR)
  const number = fraction === undefined ? digits : `${digits},${fraction}`
  return `${number}${SYMBOL_SEPARATOR}${currencySymbol(currency)}`
}
