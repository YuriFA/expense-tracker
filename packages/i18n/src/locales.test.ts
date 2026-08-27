import { describe, expect, it } from 'vitest'
import en from './locales/en.json'
import ru from './locales/ru.json'

/** Flattens a nested message catalog into dot-separated key paths. */
function flatten(messages: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === 'object' && value !== null
      ? flatten(value as Record<string, unknown>, path)
      : [path]
  })
}

describe('message catalogs', () => {
  it('keeps EN/RU keys in parity (every RU key exists in EN and vice versa)', () => {
    const enKeys = new Set(flatten(en))
    const ruKeys = new Set(flatten(ru))
    expect([...ruKeys].filter((key) => !enKeys.has(key)), 'keys only in RU').toEqual([])
    expect([...enKeys].filter((key) => !ruKeys.has(key)), 'keys only in EN').toEqual([])
  })
})
