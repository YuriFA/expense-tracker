import { describe, expect, it } from '@jest/globals'
import { occurredAtForDaysAgo, quickDateOptions } from './quick-dates'

describe('quickDateOptions', () => {
  it('labels chips today, yesterday, then short calendar dates', () => {
    const now = new Date(2026, 7, 19, 15, 30)
    expect(quickDateOptions(now).map((option) => option.label)).toEqual([
      'Сегодня',
      'Вчера',
      '17 авг.',
      '16 авг.',
      '15 авг.',
      '14 авг.',
      '13 авг.',
    ])
  })

  it('crosses a month boundary in the date chips', () => {
    const now = new Date(2026, 8, 2, 9, 0)
    expect(quickDateOptions(now).map((option) => option.label)).toEqual([
      'Сегодня',
      'Вчера',
      '31 авг.',
      '30 авг.',
      '29 авг.',
      '28 авг.',
      '27 авг.',
    ])
  })

  it('produces occurredAt keeping now\'s time of day', () => {
    const now = new Date(2026, 7, 19, 15, 30, 10)
    expect(occurredAtForDaysAgo(2, now)).toBe(new Date(2026, 7, 17, 15, 30, 10).toISOString())
  })
})
