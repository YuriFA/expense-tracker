import { describe, it, expect } from 'vitest'
import {
  addDays,
  clampDate,
  dayDiff,
  isAfterDay,
  isBeforeDay,
  isLeapYear,
  isSameDay,
  isWithinRange,
  startOfDay,
  subDays,
  today,
} from '../date'

/**
 * Local-calendar-day helpers (no UTC drift). All inputs use the
 * `new Date(year, monthIndex, day)` local constructor - never the ISO-only
 * `new Date('YYYY-MM-DD')` form, which the spec flags as timezone-ambiguous.
 */
const d = (
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
) => new Date(year, monthIndex, day, hour, minute, second, ms)

describe('startOfDay / today', () => {
  it('normalizes to local midnight', () => {
    const noon = new Date(2026, 7, 13, 14, 30, 5, 250)
    expect(startOfDay(noon)).toEqual(d(2026, 7, 13))
  })

  it('today is local midnight on the current calendar day', () => {
    const now = new Date()
    expect(isSameDay(today(), now)).toBe(true)
    expect(today().getHours()).toBe(0)
    expect(today().getMinutes()).toBe(0)
  })
})

describe('isSameDay', () => {
  it('matches by calendar day regardless of time', () => {
    expect(isSameDay(d(2026, 7, 13, 0, 0, 0), d(2026, 7, 13, 23, 59, 59))).toBe(true)
  })

  it('does not match across a midnight boundary', () => {
    expect(isSameDay(d(2026, 7, 13, 23, 59), d(2026, 7, 14, 0, 1))).toBe(false)
  })

  it('is referentially lenient (same day, different instances)', () => {
    expect(isSameDay(new Date(2026, 7, 13), new Date(2026, 7, 13))).toBe(true)
  })
})

describe('addDays / subDays', () => {
  it('adds a single day', () => {
    expect(addDays(d(2026, 7, 13), 1)).toEqual(d(2026, 7, 14))
  })

  it('subtracts via a negative amount', () => {
    expect(addDays(d(2026, 7, 13), -1)).toEqual(d(2026, 7, 12))
  })

  it('subDays mirrors a negative addDays', () => {
    expect(subDays(d(2026, 7, 13), 1)).toEqual(d(2026, 7, 12))
  })

  it('rolls over a month boundary (Aug 31 -> Sep 1)', () => {
    expect(addDays(d(2026, 7, 31), 1)).toEqual(d(2026, 8, 1))
  })

  it('rolls over a year boundary (Dec 31 -> Jan 1 next year)', () => {
    expect(addDays(d(2026, 11, 31), 1)).toEqual(d(2027, 0, 1))
  })

  it('handles leap day (Feb 28 2024 + 1 -> Feb 29)', () => {
    expect(addDays(d(2024, 1, 28), 1)).toEqual(d(2024, 1, 29))
  })

  it('skips Feb 29 in a non-leap year (Feb 28 2023 + 1 -> Mar 1)', () => {
    expect(addDays(d(2023, 1, 28), 1)).toEqual(d(2023, 2, 1))
  })

  it('normalizes stray time components back to midnight', () => {
    const withTime = new Date(2026, 7, 13, 14, 30)
    expect(addDays(withTime, 2)).toEqual(d(2026, 7, 15))
  })

  it('crosses a large span (one year forward, non-leap)', () => {
    expect(addDays(d(2026, 7, 13), 365)).toEqual(d(2027, 7, 13))
  })
})

describe('dayDiff', () => {
  it('counts whole days between two dates', () => {
    expect(dayDiff(d(2026, 7, 13), d(2026, 7, 20))).toBe(7)
  })

  it('is negative when the second date is earlier', () => {
    expect(dayDiff(d(2026, 7, 20), d(2026, 7, 13))).toBe(-7)
  })

  it('is zero on the same calendar day', () => {
    expect(dayDiff(d(2026, 7, 13, 1, 0), d(2026, 7, 13, 23, 0))).toBe(0)
  })

  it('survives a DST-like jump by rounding to whole days', () => {
    // dayDiff rounds, so a 23h/25h calendar boundary still reports a whole day.
    expect(dayDiff(d(2026, 0, 1), d(2026, 0, 2))).toBe(1)
  })
})

describe('isLeapYear', () => {
  it('flags 2024 (divisible by 4, not a century)', () => {
    expect(isLeapYear(d(2024, 0, 1))).toBe(true)
  })

  it('does not flag 2100 (century not divisible by 400)', () => {
    expect(isLeapYear(d(2100, 0, 1))).toBe(false)
  })

  it('flags 2000 (century divisible by 400)', () => {
    expect(isLeapYear(d(2000, 0, 1))).toBe(true)
  })

  it('does not flag a common year', () => {
    expect(isLeapYear(d(2023, 0, 1))).toBe(false)
  })
})

describe('isBeforeDay / isAfterDay', () => {
  it('orders strictly by calendar day', () => {
    expect(isBeforeDay(d(2026, 7, 13), d(2026, 7, 14))).toBe(true)
    expect(isAfterDay(d(2026, 7, 14), d(2026, 7, 13))).toBe(true)
  })

  it('is false for the same day in both directions', () => {
    expect(isBeforeDay(d(2026, 7, 13), d(2026, 7, 13))).toBe(false)
    expect(isAfterDay(d(2026, 7, 13), d(2026, 7, 13))).toBe(false)
  })
})

describe('clampDate', () => {
  it('returns the date unchanged (but normalized) when in range', () => {
    const clamped = clampDate(d(2026, 7, 13), d(2026, 0, 1), d(2026, 11, 31))
    expect(clamped).toEqual(d(2026, 7, 13))
  })

  it('clamps below the minimum', () => {
    expect(clampDate(d(2025, 0, 1), d(2026, 0, 1), d(2026, 11, 31))).toEqual(d(2026, 0, 1))
  })

  it('clamps above the maximum', () => {
    expect(clampDate(d(2027, 0, 1), d(2026, 0, 1), d(2026, 11, 31))).toEqual(d(2026, 11, 31))
  })

  it('honors an open lower bound', () => {
    expect(clampDate(d(2020, 0, 1), undefined, d(2026, 11, 31))).toEqual(d(2020, 0, 1))
  })

  it('honors an open upper bound', () => {
    expect(clampDate(d(2030, 0, 1), d(2026, 0, 1), undefined)).toEqual(d(2030, 0, 1))
  })

  it('normalizes a time-bearing input', () => {
    expect(clampDate(new Date(2026, 7, 13, 9, 30))).toEqual(d(2026, 7, 13))
  })
})

describe('isWithinRange', () => {
  const min = d(2026, 0, 1)
  const max = d(2026, 11, 31)

  it('includes the bounds and interior', () => {
    expect(isWithinRange(min, min, max)).toBe(true)
    expect(isWithinRange(max, min, max)).toBe(true)
    expect(isWithinRange(d(2026, 5, 15), min, max)).toBe(true)
  })

  it('excludes dates outside the bounds', () => {
    expect(isWithinRange(d(2025, 11, 31), min, max)).toBe(false)
    expect(isWithinRange(d(2027, 0, 1), min, max)).toBe(false)
  })

  it('treats a missing bound as unbounded on that side', () => {
    expect(isWithinRange(d(2000, 0, 1), undefined, max)).toBe(true)
    expect(isWithinRange(d(2099, 0, 1), min, undefined)).toBe(true)
  })
})
