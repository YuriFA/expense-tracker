import { describe, it, expect } from 'vitest'
import { formatMoney, formatMoneyCompact } from './format'

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

describe('formatMoneyCompact', () => {
  it('drops kopecks below one million but keeps exact grouping', () => {
    // 45 300,00 ₽ -> "45 300 ₽" (group separators are no-break spaces).
    const result = formatMoneyCompact(4_530_000, 'RUB', 'ru-RU')
    expect(result).toBe('45\u202F300\u00A0₽')
  })

  it('renders zero exactly', () => {
    expect(formatMoneyCompact(0, 'RUB', 'ru-RU')).toBe('0\u00A0₽')
  })

  it('abbreviates one million exactly (dashboard debt-tile case)', () => {
    // 1 000 100,00 ₽ -> "1 млн ₽" (one fractional digit, zero trimmed).
    expect(formatMoneyCompact(100_010_000, 'RUB', 'ru-RU')).toBe('1\u00A0млн\u00A0₽')
    expect(formatMoneyCompact(100_000_000, 'RUB', 'ru-RU')).toBe('1\u00A0млн\u00A0₽')
  })

  it('keeps one fractional digit when the magnitude is not round', () => {
    // 1 234 567,00 ₽ -> "1,2 млн ₽".
    expect(formatMoneyCompact(123_456_700, 'RUB', 'ru-RU')).toBe('1,2\u00A0млн\u00A0₽')
  })

  it('rounds half-up on the fractional digit', () => {
    // 1 249 999,00 ₽ -> 12.49999 -> "1,2"; 1 250 000,00 ₽ -> 12.5 -> "1,3".
    expect(formatMoneyCompact(124_999_900, 'RUB', 'ru-RU')).toBe('1,2\u00A0млн\u00A0₽')
    expect(formatMoneyCompact(125_000_000, 'RUB', 'ru-RU')).toBe('1,3\u00A0млн\u00A0₽')
  })

  it('escalates a rounding carry into the next tier', () => {
    // 999 970 000,00 ₽ rounds to "1 000,0 млн" -> "1 млрд ₽".
    expect(formatMoneyCompact(999_970_000_00, 'RUB', 'ru-RU')).toBe('1\u00A0млрд\u00A0₽')
  })

  it('abbreviates billions and trillions', () => {
    expect(formatMoneyCompact(1_234_000_000_00, 'RUB', 'ru-RU')).toBe('1,2\u00A0млрд\u00A0₽')
    expect(formatMoneyCompact(1_234_000_000_000_00, 'RUB', 'ru-RU')).toBe('1,2\u00A0трлн\u00A0₽')
  })

  it('keeps the leading minus sign before the whole figure', () => {
    expect(formatMoneyCompact(-123_456_700, 'RUB', 'ru-RU')).toBe('-1,2\u00A0млн\u00A0₽')
  })

  it('uses the en shape: prefix symbol and latin tier letters', () => {
    expect(formatMoneyCompact(123_456_700, 'USD', 'en-US')).toBe('$1.2M')
    expect(formatMoneyCompact(4_530_000, 'USD', 'en-US')).toBe('$45,300')
    expect(formatMoneyCompact(123_456_700, 'RUB', 'en-US')).toBe('₽1.2M')
  })
})
