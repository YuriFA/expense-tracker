import { describe, expect, it } from '@jest/globals'
import { parseMajorUnitsToMinor, sanitizeAmountInput } from './parse'

describe('money/parse · sanitizeAmountInput', () => {
  it('normalizes grouping spaces and the dot separator', () => {
    expect(sanitizeAmountInput('31\u202F343,5')).toBe('31343,5')
    expect(sanitizeAmountInput('31343.5')).toBe('31343,5')
  })

  it('keeps only the first separator and at most two fraction digits', () => {
    expect(sanitizeAmountInput('12,345')).toBe('12,34')
    expect(sanitizeAmountInput('1,2,3')).toBe('1,2')
  })

  it('strips non-digit characters and keeps the empty string empty', () => {
    expect(sanitizeAmountInput('12a3')).toBe('123')
    expect(sanitizeAmountInput('')).toBe('')
  })
})

describe('money/parse · parseMajorUnitsToMinor', () => {
  it('parses both separators to exact minor units', () => {
    expect(parseMajorUnitsToMinor('12,50')).toBe(1250)
    expect(parseMajorUnitsToMinor('12.50')).toBe(1250)
  })
})
