import { describe, expect, it } from '@jest/globals'
import { applyKeypadInput, type KeypadKey } from './amount-keypad'

function typeKeys(start: string, keys: KeypadKey[]): string {
  return keys.reduce((value, key) => applyKeypadInput(value, key), start)
}

describe('applyKeypadInput', () => {
  it('accumulates digits: 0 -> 1 -> 12', () => {
    expect(typeKeys('', ['1'])).toBe('1')
    expect(typeKeys('', ['1', '2'])).toBe('12')
  })

  it('types a separator after the integer part', () => {
    expect(typeKeys('12', ['separator'])).toBe('12,')
    expect(typeKeys('', ['separator'])).toBe('0,')
  })

  it('keeps only one separator', () => {
    expect(typeKeys('12,', ['separator'])).toBe('12,')
  })

  it('fills the fraction: 12,5 -> 12,50', () => {
    expect(typeKeys('12,5', ['0'])).toBe('12,50')
  })

  it('caps the fraction at two digits', () => {
    expect(typeKeys('12,50', ['5'])).toBe('12,50')
  })

  it('backspaces through the whole value: 12,50 -> 12,5 -> 12, -> 12 -> ""', () => {
    expect(typeKeys('12,50', ['backspace'])).toBe('12,5')
    expect(typeKeys('12,5', ['backspace'])).toBe('12,')
    expect(typeKeys('12,', ['backspace'])).toBe('12')
    expect(typeKeys('12', ['backspace'])).toBe('1')
    expect(typeKeys('', ['backspace'])).toBe('')
  })

  it('replaces a lone leading zero', () => {
    expect(typeKeys('0', ['5'])).toBe('5')
    expect(typeKeys('', ['0'])).toBe('0')
    expect(typeKeys('0', ['0'])).toBe('0')
  })

  it('caps the integer part at nine digits', () => {
    const nine = '123456789'
    expect(typeKeys(nine, ['5'])).toBe(nine)
  })

  it('runs the full acceptance sequence from the plan', () => {
    const value = typeKeys('', ['1', '2', 'separator', '5', '0'])
    expect(value).toBe('12,50')
    expect(applyKeypadInput(value, 'backspace')).toBe('12,5')
  })
})
