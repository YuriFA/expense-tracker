import { describe, it, expect } from 'vitest'
import {
  asDateTimeString,
  asInteger,
  asNonEmptyString,
  asNumber,
  asPositiveInteger,
  asPositiveNumber,
  asString,
  isRecord,
} from './normalize'

describe('isRecord', () => {
  it('returns true for non-null object', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord({ a: 1 })).toBe(true)
  })

  it('returns false for null', () => {
    expect(isRecord(null)).toBe(false)
  })

  it('returns false for non-objects', () => {
    expect(isRecord('string')).toBe(false)
    expect(isRecord(42)).toBe(false)
    expect(isRecord(true)).toBe(false)
    expect(isRecord(undefined)).toBe(false)
  })

  it('returns true for arrays (they are objects)', () => {
    expect(isRecord([])).toBe(true)
  })
})

describe('asString', () => {
  it('returns string value as-is', () => {
    expect(asString('hello')).toBe('hello')
    expect(asString('')).toBe('')
  })

  it('returns null for non-strings', () => {
    expect(asString(42)).toBeNull()
    expect(asString(null)).toBeNull()
    expect(asString(undefined)).toBeNull()
    expect(asString(true)).toBeNull()
    expect(asString({})).toBeNull()
  })
})

describe('asNonEmptyString', () => {
  it('returns non-empty trimmed string', () => {
    expect(asNonEmptyString('hello')).toBe('hello')
    expect(asNonEmptyString('  hello  ')).toBe('  hello  ')
  })

  it('returns null for empty string', () => {
    expect(asNonEmptyString('')).toBeNull()
    expect(asNonEmptyString('   ')).toBeNull()
  })

  it('returns null for non-strings', () => {
    expect(asNonEmptyString(42)).toBeNull()
    expect(asNonEmptyString(null)).toBeNull()
  })
})

describe('asNumber', () => {
  it('returns finite numbers', () => {
    expect(asNumber(0)).toBe(0)
    expect(asNumber(42)).toBe(42)
    expect(asNumber(-3.14)).toBe(-3.14)
  })

  it('returns null for non-numbers', () => {
    expect(asNumber('42')).toBeNull()
    expect(asNumber(null)).toBeNull()
    expect(asNumber(true)).toBeNull()
  })

  it('returns null for non-finite numbers', () => {
    expect(asNumber(Infinity)).toBeNull()
    expect(asNumber(-Infinity)).toBeNull()
    expect(asNumber(NaN)).toBeNull()
  })
})

describe('asPositiveNumber', () => {
  it('returns positive finite numbers', () => {
    expect(asPositiveNumber(1)).toBe(1)
    expect(asPositiveNumber(0.01)).toBe(0.01)
  })

  it('returns null for zero and negatives', () => {
    expect(asPositiveNumber(0)).toBeNull()
    expect(asPositiveNumber(-1)).toBeNull()
  })

  it('returns null for non-finite numbers', () => {
    expect(asPositiveNumber(Infinity)).toBeNull()
    expect(asPositiveNumber(NaN)).toBeNull()
  })

  it('returns null for non-numbers', () => {
    expect(asPositiveNumber('1')).toBeNull()
    expect(asPositiveNumber(null)).toBeNull()
  })
})

describe('asInteger', () => {
  it('returns finite integers of any sign', () => {
    expect(asInteger(0)).toBe(0)
    expect(asInteger(42)).toBe(42)
    expect(asInteger(-3)).toBe(-3)
  })

  it('returns null for floats', () => {
    expect(asInteger(3.14)).toBeNull()
    expect(asInteger(-0.5)).toBeNull()
  })

  it('returns null for non-numbers', () => {
    expect(asInteger('42')).toBeNull()
    expect(asInteger(null)).toBeNull()
    expect(asInteger(true)).toBeNull()
  })

  it('returns null for non-finite numbers', () => {
    expect(asInteger(Infinity)).toBeNull()
    expect(asInteger(-Infinity)).toBeNull()
    expect(asInteger(NaN)).toBeNull()
  })
})

describe('asPositiveInteger', () => {
  it('returns positive finite integers', () => {
    expect(asPositiveInteger(1)).toBe(1)
    expect(asPositiveInteger(100)).toBe(100)
  })

  it('returns null for zero and negatives', () => {
    expect(asPositiveInteger(0)).toBeNull()
    expect(asPositiveInteger(-1)).toBeNull()
  })

  it('returns null for floats', () => {
    expect(asPositiveInteger(0.5)).toBeNull()
    expect(asPositiveInteger(1.5)).toBeNull()
  })

  it('returns null for non-finite numbers', () => {
    expect(asPositiveInteger(Infinity)).toBeNull()
    expect(asPositiveInteger(NaN)).toBeNull()
  })

  it('returns null for non-numbers', () => {
    expect(asPositiveInteger('1')).toBeNull()
    expect(asPositiveInteger(null)).toBeNull()
  })
})

describe('asDateTimeString', () => {
  it('returns valid ISO datetime string', () => {
    expect(asDateTimeString('2024-01-15T10:30:00Z')).toBe('2024-01-15T10:30:00Z')
    expect(asDateTimeString('2024-01-15')).toBe('2024-01-15')
  })

  it('returns null for invalid datetime strings', () => {
    expect(asDateTimeString('not a date')).toBeNull()
    expect(asDateTimeString('')).toBeNull()
  })

  it('returns null for non-strings', () => {
    expect(asDateTimeString(12345)).toBeNull()
    expect(asDateTimeString(null)).toBeNull()
  })
})
