import { USD, EUR, RUB } from 'dinero.js/currencies'
import type { DineroCurrency } from 'dinero.js'

export const CURRENCY_MAP = {
  USD,
  EUR,
  RUB,
} as const satisfies Record<string, DineroCurrency<number>>

export const AVAILABLE_CURRENCIES = Object.keys(CURRENCY_MAP) as (keyof typeof CURRENCY_MAP)[]
export type CurrencyCode = keyof typeof CURRENCY_MAP

export const DEFAULT_CURRENCY: CurrencyCode = 'USD'

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (AVAILABLE_CURRENCIES as readonly string[]).includes(value)
}

export function getDineroCurrency(code: CurrencyCode): DineroCurrency<number> {
  return CURRENCY_MAP[code]
}
