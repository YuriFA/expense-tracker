import { describe, it, expect } from 'vitest'
import { formatMoney } from './format'

describe('formatMoney', () => {
  it('formats positive value in en-US USD', () => {
    const result = formatMoney(123456, 'USD', 'en-US')
    expect(result).toContain('1,234.56')
    expect(result).toContain('$')
  })

  it('formats zero value', () => {
    const result = formatMoney(0, 'USD', 'en-US')
    expect(result).toContain('0.00')
  })

  it('formats negative value', () => {
    const result = formatMoney(-10000, 'USD', 'en-US')
    expect(result).toContain('100.00')
    expect(result).toMatch(/-|\(100\.00\)/)
  })

  it('formats large numbers with thousand separators', () => {
    const result = formatMoney(100_000_000, 'USD', 'en-US')
    expect(result).toContain('1,000,000')
  })

  it('respects locale formatting', () => {
    const ruResult = formatMoney(100_000, 'RUB', 'ru-RU')
    const enResult = formatMoney(100_000, 'USD', 'en-US')
    expect(ruResult).not.toBe(enResult)
  })

  it('uses narrowSymbol currencyDisplay', () => {
    const result = formatMoney(10_000, 'USD', 'en-US')
    expect(result).toMatch(/\$/)
    expect(result).not.toContain('US$')
  })

  it('preserves fractional kopeks precisely (no float drift)', () => {
    const result = formatMoney(1050, 'USD', 'en-US')
    expect(result).toContain('10.50')
  })
})
