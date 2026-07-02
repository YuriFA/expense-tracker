import { describe, it, expect } from 'vitest'
import { formatCurrency } from './format'

describe('formatCurrency', () => {
  it('formats positive value in en-US USD', () => {
    const result = formatCurrency(1234.56, 'USD', 'en-US')
    expect(result).toContain('1,234.56')
    expect(result).toContain('$')
  })

  it('formats zero value', () => {
    const result = formatCurrency(0, 'USD', 'en-US')
    expect(result).toContain('0.00')
  })

  it('formats negative value', () => {
    const result = formatCurrency(-100, 'USD', 'en-US')
    expect(result).toContain('100.00')
    expect(result).toContain('-') // either as prefix or in parentheses (accounting style)
  })

  it('formats large numbers with thousand separators', () => {
    const result = formatCurrency(1_000_000, 'USD', 'en-US')
    expect(result).toContain('1,000,000')
  })

  it('respects locale formatting', () => {
    const ruResult = formatCurrency(1000, 'RUB', 'ru-RU')
    const enResult = formatCurrency(1000, 'USD', 'en-US')
    // Different locales produce different separators
    expect(ruResult).not.toBe(enResult)
  })

  it('uses narrowSymbol currencyDisplay', () => {
    const result = formatCurrency(100, 'USD', 'en-US')
    // Narrow symbol $ should be present, not full "US$"
    expect(result).toMatch(/\$/)
    expect(result).not.toContain('US$')
  })
})
