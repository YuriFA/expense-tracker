import { describe, expect, it } from '@jest/globals'
import { parseMajorUnitsToMinor } from './parse'
import { formatAmountInput, groupAmountInput, minorToInputValue } from './display'

describe('money/display · groupAmountInput', () => {
  it('groups the integer part with a narrow no-break space', () => {
    expect(groupAmountInput('31343,5')).toBe('31\u202F343,5')
  })

  it('keeps short integers ungrouped and the transient trailing separator', () => {
    expect(groupAmountInput('125')).toBe('125')
    expect(groupAmountInput('125,')).toBe('125,')
  })

  it('substitutes 0 for an empty integer while a fraction is typed', () => {
    expect(groupAmountInput(',5')).toBe('0,5')
  })
})

describe('money/display · formatAmountInput', () => {
  it('appends the currency symbol with a no-break space', () => {
    expect(formatAmountInput('1250,5', 'RUB')).toBe('1\u202F250,5\u00A0₽')
  })
})

describe('money/display · minorToInputValue', () => {
  it('converts minor units to a major string with a fraction', () => {
    expect(minorToInputValue(31_343_31)).toBe('31343,31')
  })

  it('drops a zero fraction entirely', () => {
    expect(minorToInputValue(200_00)).toBe('200')
  })

  it('trims trailing fraction zeros', () => {
    expect(minorToInputValue(200_30)).toBe('200,3')
  })

  it('round-trips through parseMajorUnitsToMinor without loss', () => {
    for (const minor of [1, 99, 100, 1_234_00, 31_343_31, 999_999_99]) {
      expect(parseMajorUnitsToMinor(minorToInputValue(minor))).toBe(minor)
    }
  })
})
