import { dinero, type Dinero } from 'dinero.js'
import { getDineroCurrency, type CurrencyCode } from './currencies'

export type Money = Dinero<number>

export function toMoney(amountMinor: number, code: CurrencyCode): Money {
  return dinero({ amount: amountMinor, currency: getDineroCurrency(code) })
}
