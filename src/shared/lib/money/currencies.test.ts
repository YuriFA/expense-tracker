import { describe, it, expect } from 'vitest'
import {
  AVAILABLE_CURRENCIES,
  DEFAULT_CURRENCY,
  CURRENCY_MAP,
  isCurrencyCode,
  getDineroCurrency,
} from './currencies'

describe('currencies', () => {
  it('exports available currency codes', () => {
    expect(AVAILABLE_CURRENCIES).toEqual(['USD', 'EUR', 'RUB'])
  })

  it('defaults to USD', () => {
    expect(DEFAULT_CURRENCY).toBe('USD')
  })

  it('maps each code to a dinero currency with code/base/exponent', () => {
    for (const code of AVAILABLE_CURRENCIES) {
      const currency = CURRENCY_MAP[code]
      expect(currency.code).toBe(code)
      expect(currency.base).toBe(10)
      expect(currency.exponent).toBe(2)
    }
  })

  it('exposes getDineroCurrency lookup', () => {
    expect(getDineroCurrency('USD').code).toBe('USD')
    expect(getDineroCurrency('EUR').code).toBe('EUR')
    expect(getDineroCurrency('RUB').code).toBe('RUB')
  })
})

describe('isCurrencyCode', () => {
  it('returns true for supported codes', () => {
    expect(isCurrencyCode('USD')).toBe(true)
    expect(isCurrencyCode('EUR')).toBe(true)
    expect(isCurrencyCode('RUB')).toBe(true)
  })

  it('returns false for unsupported codes', () => {
    expect(isCurrencyCode('JPY')).toBe(false)
    expect(isCurrencyCode('GBP')).toBe(false)
  })

  it('returns false for non-string values', () => {
    expect(isCurrencyCode(null)).toBe(false)
    expect(isCurrencyCode(42)).toBe(false)
    expect(isCurrencyCode(undefined)).toBe(false)
  })
})
