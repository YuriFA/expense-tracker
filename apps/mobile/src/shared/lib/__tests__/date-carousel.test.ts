import { describe, it, expect } from 'vitest'
import {
  buildDayBuffer,
  clampOffset,
  dateForOffset,
  nearestEnabledOffset,
  offsetForDate,
  resolveDisabled,
} from '../date-carousel'
import { addDays, isSameDay } from '../date'

const d = (
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
) => new Date(year, monthIndex, day, hour, minute)

describe('resolveDisabled', () => {
  it('matches nothing when the spec is undefined', () => {
    const isDisabled = resolveDisabled(undefined)
    expect(isDisabled(d(2026, 7, 13))).toBe(false)
  })

  it('matches a fixed list by calendar day (ignoring time)', () => {
    const isDisabled = resolveDisabled([new Date(2026, 7, 13, 9, 30)])
    expect(isDisabled(d(2026, 7, 13))).toBe(true)
    expect(isDisabled(d(2026, 7, 13, 22, 0))).toBe(true)
    expect(isDisabled(d(2026, 7, 14))).toBe(false)
  })

  it('delegates to a predicate (normalized to midnight)', () => {
    const isDisabled = resolveDisabled((date) => date.getDay() === 0) // Sundays
    expect(isDisabled(d(2026, 7, 16))).toBe(true) // 2026-08-16 is a Sunday
    expect(isDisabled(d(2026, 7, 17))).toBe(false)
  })
})

describe('buildDayBuffer', () => {
  it('builds an exact bounded range when both limits are set', () => {
    const buffer = buildDayBuffer({
      minDate: d(2026, 7, 10),
      maxDate: d(2026, 7, 13),
      referenceDate: d(2026, 7, 13),
    })
    expect(buffer.start).toEqual(d(2026, 7, 10))
    expect(buffer.count).toBe(4) // 10, 11, 12, 13
  })

  it('spans backward from the reference when minDate is open', () => {
    const buffer = buildDayBuffer({
      maxDate: d(2026, 7, 13),
      referenceDate: d(2026, 7, 13),
      pastSpanDays: 3,
    })
    expect(buffer.start).toEqual(d(2026, 7, 10))
    expect(buffer.count).toBe(4)
  })

  it('spans forward from the reference when maxDate is open', () => {
    const buffer = buildDayBuffer({
      minDate: d(2026, 7, 13),
      referenceDate: d(2026, 7, 13),
      futureSpanDays: 3,
    })
    expect(buffer.start).toEqual(d(2026, 7, 13))
    expect(buffer.count).toBe(4)
  })

  it('uses symmetric spans around the reference when both are open', () => {
    const buffer = buildDayBuffer({
      referenceDate: d(2026, 7, 13),
      pastSpanDays: 2,
      futureSpanDays: 2,
    })
    expect(buffer.start).toEqual(d(2026, 7, 11))
    expect(buffer.count).toBe(5) // 11..15
  })

  it('collapses to the single reference day when bounds are inverted', () => {
    const buffer = buildDayBuffer({
      minDate: d(2026, 7, 20),
      maxDate: d(2026, 7, 10),
      referenceDate: d(2026, 7, 15),
    })
    expect(buffer.count).toBe(1)
    expect(buffer.start).toEqual(d(2026, 7, 15))
  })

  it('default spans are large enough to feel unbounded', () => {
    const buffer = buildDayBuffer({ referenceDate: d(2026, 7, 13) })
    // 20 years each way (~14600 days) - well beyond any realistic back-date,
    // while keeping the per-render data array cheap to iterate.
    expect(buffer.count).toBeGreaterThan(365 * 30)
  })
})

describe('offset <-> date round-trip', () => {
  const buffer = buildDayBuffer({
    minDate: d(2026, 7, 10),
    maxDate: d(2026, 7, 13),
    referenceDate: d(2026, 7, 13),
  })

  it('dateForOffset returns consecutive days from the start', () => {
    expect(dateForOffset(buffer, 0)).toEqual(d(2026, 7, 10))
    expect(dateForOffset(buffer, 3)).toEqual(d(2026, 7, 13))
  })

  it('offsetForDate is the inverse of dateForOffset', () => {
    for (let offset = 0; offset < buffer.count; offset++) {
      expect(offsetForDate(buffer, dateForOffset(buffer, offset))).toBe(offset)
    }
  })

  it('offsetForDate handles month / year rollovers', () => {
    const rollover = buildDayBuffer({
      minDate: d(2026, 11, 30),
      maxDate: d(2027, 0, 2),
      referenceDate: d(2027, 0, 1),
    })
    expect(offsetForDate(rollover, d(2027, 0, 1))).toBe(2)
    expect(isSameDay(dateForOffset(rollover, 3), d(2027, 0, 2))).toBe(true)
  })
})

describe('clampOffset', () => {
  const buffer = buildDayBuffer({
    minDate: d(2026, 7, 10),
    maxDate: d(2026, 7, 13),
    referenceDate: d(2026, 7, 13),
  })

  it('clamps negative offsets to 0', () => {
    expect(clampOffset(buffer, -5)).toBe(0)
  })

  it('clamps out-of-range high offsets to the last index', () => {
    expect(clampOffset(buffer, 99)).toBe(3)
  })

  it('rounds a fractional offset to the nearest day', () => {
    expect(clampOffset(buffer, 1.4)).toBe(1)
    expect(clampOffset(buffer, 1.6)).toBe(2)
  })
})

describe('nearestEnabledOffset', () => {
  const buffer = buildDayBuffer({
    minDate: d(2026, 7, 10),
    maxDate: d(2026, 7, 14),
    referenceDate: d(2026, 7, 14),
  })
  const disabled = new Set([1, 3]) // disable offsets 1 and 3 (Aug 11 and Aug 13)
  const isDisabled = (date: Date) => disabled.has(offsetForDate(buffer, date))

  it('returns the offset itself when it is enabled', () => {
    expect(nearestEnabledOffset(buffer, 0, isDisabled)).toBe(0)
    expect(nearestEnabledOffset(buffer, 2, isDisabled)).toBe(2)
  })

  it('prefers the earlier neighbor on a tie when the landed offset is disabled', () => {
    // Offset 1 is disabled; 0 and 2 are equidistant -> picks the earlier (0).
    expect(nearestEnabledOffset(buffer, 1, isDisabled)).toBe(0)
  })

  it('finds the nearest enabled when only one side is available', () => {
    // Offset 3 disabled; 2 and 4 equidistant -> earlier (2).
    expect(nearestEnabledOffset(buffer, 3, isDisabled)).toBe(2)
  })

  it('returns null when every day is disabled', () => {
    const allDisabled = () => true
    expect(nearestEnabledOffset(buffer, 2, allDisabled)).toBe(null)
  })

  it('clamps the search to the buffer range', () => {
    // Offset 0 disabled; only the forward neighbor (1) is in range.
    const isDisabledEdge = (date: Date) => offsetForDate(buffer, date) === 0
    expect(nearestEnabledOffset(buffer, 0, isDisabledEdge)).toBe(1)
  })

  it('respects disabled dates expressed as real Date values', () => {
    const real = buildDayBuffer({
      minDate: d(2026, 7, 10),
      maxDate: d(2026, 7, 12),
      referenceDate: d(2026, 7, 12),
    })
    const pred = resolveDisabled([d(2026, 7, 11)])
    expect(nearestEnabledOffset(real, 1, pred)).toBe(0) // tie -> earlier
    expect(nearestEnabledOffset(real, 1, resolveDisabled(undefined))).toBe(1)
  })
})

describe('large-buffer sanity (infinite-feel past)', () => {
  it('maps a date years before the reference to a valid offset', () => {
    const reference = d(2026, 7, 13)
    const buffer = buildDayBuffer({ maxDate: reference, referenceDate: reference })
    const yearsAgo = addDays(reference, -365 * 5)
    const offset = clampOffset(buffer, offsetForDate(buffer, yearsAgo))
    expect(offset).toBeGreaterThan(0)
    expect(offset).toBeLessThan(buffer.count)
    expect(isSameDay(dateForOffset(buffer, offset), yearsAgo)).toBe(true)  })
})
