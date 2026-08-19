import { describe, expect, it } from '@jest/globals'
import { fullDayLabel, monthRangeLabel, monthRangeLabelShort } from './format'

describe('format · period labels', () => {
  it('monthRangeLabel keeps the uppercase summary-card style', () => {
    expect(monthRangeLabel(2026, 7)).toBe('1 АВГ. — 31 АВГ.')
    expect(monthRangeLabel(2026, 1)).toBe('1 ФЕВ. — 28 ФЕВ.')
    expect(monthRangeLabel(2028, 1)).toBe('1 ФЕВ. — 29 ФЕВ.')
  })

  it('monthRangeLabelShort renders the lowercase sheet-subtitle style', () => {
    expect(monthRangeLabelShort(2026, 7)).toBe('1 авг. - 31 авг.')
    expect(monthRangeLabelShort(2026, 0)).toBe('1 янв. - 31 янв.')
    expect(monthRangeLabelShort(2026, 3)).toBe('1 апр. - 30 апр.')
  })
})

describe('format · fullDayLabel', () => {
  it('renders the day with a genitive month name', () => {
    // Midday UTC keeps the local calendar date stable across timezones.
    expect(fullDayLabel('2026-08-17T12:00:00.000Z')).toBe('17 августа')
    expect(fullDayLabel('2026-01-02T12:00:00.000Z')).toBe('2 января')
    expect(fullDayLabel('2026-12-31T12:00:00.000Z')).toBe('31 декабря')
  })
})
