import { describe, it, expect } from 'vitest'
import {
  addCalendarDays,
  currentDay,
  formatCalendarDay,
  formatCalendarRange,
  isCalendarDay,
  parseCalendarDay,
  parseCalendarDayOrFallback,
  startOfMonth,
  toEndOfDay,
  toStartOfDay,
} from './index'

describe('currentDay', () => {
  it('returns a valid calendar day (YYYY-MM-DD)', () => {
    const result = currentDay()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('isCalendarDay', () => {
  it('returns true for valid YYYY-MM-DD format', () => {
    expect(isCalendarDay('2024-01-15')).toBe(true)
    expect(isCalendarDay('2024-12-31')).toBe(true)
  })

  it('returns false for invalid format', () => {
    expect(isCalendarDay('not-a-date')).toBe(false)
    expect(isCalendarDay('2024/01/15')).toBe(false)
    expect(isCalendarDay('2024-13-01')).toBe(false)
  })
})

describe('parseCalendarDay', () => {
  it('returns the same string when valid', () => {
    expect(parseCalendarDay('2024-01-15')).toBe('2024-01-15')
  })

  it('rejects non-padded YYYY-MM-DD format', () => {
    expect(() => parseCalendarDay('2024-1-5')).toThrow()
  })

  it('throws for invalid input', () => {
    expect(() => parseCalendarDay('invalid')).toThrow()
  })
})

describe('parseCalendarDayOrFallback', () => {
  it('returns parsed value for valid input', () => {
    expect(parseCalendarDayOrFallback('2024-01-15', '2024-01-01')).toBe('2024-01-15')
  })

  it('returns fallback for null', () => {
    expect(parseCalendarDayOrFallback(null, '2024-01-01')).toBe('2024-01-01')
  })

  it('returns fallback for undefined', () => {
    expect(parseCalendarDayOrFallback(undefined, '2024-01-01')).toBe('2024-01-01')
  })

  it('returns fallback for empty string', () => {
    expect(parseCalendarDayOrFallback('', '2024-01-01')).toBe('2024-01-01')
  })

  it('returns fallback for invalid input', () => {
    expect(parseCalendarDayOrFallback('invalid', '2024-01-01')).toBe('2024-01-01')
  })
})

describe('startOfMonth', () => {
  it('returns the first day of the month', () => {
    expect(startOfMonth('2024-01-15')).toBe('2024-01-01')
    expect(startOfMonth('2024-12-31')).toBe('2024-12-01')
  })
})

describe('addCalendarDays', () => {
  it('adds days forward', () => {
    expect(addCalendarDays('2024-01-01', 5)).toBe('2024-01-06')
  })

  it('adds days backward with negative amount', () => {
    expect(addCalendarDays('2024-01-10', -5)).toBe('2024-01-05')
  })

  it('handles month/year boundaries', () => {
    expect(addCalendarDays('2024-01-31', 1)).toBe('2024-02-01')
    expect(addCalendarDays('2024-12-31', 1)).toBe('2025-01-01')
  })
})

describe('toStartOfDay', () => {
  it('returns Date at midnight local time', () => {
    const result = toStartOfDay('2024-01-15')
    expect(result).toBeInstanceOf(Date)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  it('matches the correct year/month/day', () => {
    const result = toStartOfDay('2024-03-15')
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(2) // March
    expect(result.getDate()).toBe(15)
  })
})

describe('toEndOfDay', () => {
  it('returns Date at 23:59:59.999', () => {
    const result = toEndOfDay('2024-01-15')
    expect(result).toBeInstanceOf(Date)
    expect(result.getHours()).toBe(23)
    expect(result.getMinutes()).toBe(59)
    expect(result.getSeconds()).toBe(59)
    expect(result.getMilliseconds()).toBe(999)
  })
})

describe('formatCalendarDay', () => {
  it('formats day using locale and options', () => {
    const result = formatCalendarDay('2024-01-15', 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    expect(result).toContain('2024')
    expect(result).toContain('January')
    expect(result).toContain('15')
  })
})

describe('formatCalendarRange', () => {
  it('formats a range using Intl.formatRange', () => {
    const result = formatCalendarRange('2024-01-01', '2024-01-31', 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    // Both endpoints should appear in the formatted range
    expect(result).toContain('2024')
  })

  it('falls back to manual format when formatRange is not a function', () => {
    const original = Intl.DateTimeFormat.prototype.formatRange
    // Temporarily remove formatRange to exercise the fallback branch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(Intl.DateTimeFormat.prototype as any).formatRange = undefined

    try {
      const result = formatCalendarRange('2024-01-01', '2024-01-31', 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
      expect(result).toContain(' - ')
    } finally {
      ;(Intl.DateTimeFormat.prototype as any).formatRange = original
    }
  })
})
