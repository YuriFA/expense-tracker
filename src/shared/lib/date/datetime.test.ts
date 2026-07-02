import { describe, it, expect } from 'vitest'
import { getDateTimestamp, isIsoDateTime, nowIsoString, parseIsoDateTime } from './datetime'

describe('isIsoDateTime', () => {
  it('returns true for valid ISO datetime', () => {
    expect(isIsoDateTime('2024-01-15T10:30:00Z')).toBe(true)
    expect(isIsoDateTime('2024-01-15')).toBe(true)
    expect(isIsoDateTime('2024-01-15T10:30:00.000Z')).toBe(true)
  })

  it('returns false for invalid datetime string', () => {
    expect(isIsoDateTime('not a date')).toBe(false)
    expect(isIsoDateTime('')).toBe(false)
    expect(isIsoDateTime('2024-13-45')).toBe(false)
  })
})

describe('nowIsoString', () => {
  it('returns a valid ISO datetime string', () => {
    const result = nowIsoString()
    expect(isIsoDateTime(result)).toBe(true)
  })

  it('returns a string close to current time', () => {
    const before = Date.now()
    const result = nowIsoString()
    const after = Date.now()
    const parsed = Date.parse(result)
    expect(parsed).toBeGreaterThanOrEqual(before)
    expect(parsed).toBeLessThanOrEqual(after)
  })
})

describe('parseIsoDateTime', () => {
  it('returns Date object for valid ISO string', () => {
    const result = parseIsoDateTime('2024-01-15T10:30:00Z')
    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).toBe(Date.parse('2024-01-15T10:30:00Z'))
  })

  it('returns Date when passed a Date instance', () => {
    const input = new Date('2024-01-15T10:30:00Z')
    const result = parseIsoDateTime(input as never)
    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).toBe(input.getTime())
  })

  it('throws for invalid datetime string', () => {
    expect(() => parseIsoDateTime('not a date')).toThrow(/Invalid ISO datetime/)
  })
})

describe('getDateTimestamp', () => {
  it('returns timestamp for ISO string', () => {
    const result = getDateTimestamp('2024-01-15T10:30:00Z')
    expect(result).toBe(Date.parse('2024-01-15T10:30:00Z'))
  })

  it('returns timestamp for Date instance', () => {
    const date = new Date('2024-01-15T10:30:00Z')
    const result = getDateTimestamp(date)
    expect(result).toBe(date.getTime())
  })
})
