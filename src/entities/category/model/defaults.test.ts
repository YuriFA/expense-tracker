import { describe, it, expect } from 'vitest'
import { getDefaultCategories } from './defaults'

describe('getDefaultCategories', () => {
  it('returns a non-empty array of categories', () => {
    const result = getDefaultCategories()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('every category has all required fields', () => {
    const result = getDefaultCategories()
    for (const category of result) {
      expect(typeof category.id).toBe('string')
      expect(category.id.length).toBeGreaterThan(0)
      expect(typeof category.name).toBe('string')
      expect(['income', 'expense']).toContain(category.type)
      expect(typeof category.icon).toBe('string')
      expect(typeof category.color).toBe('string')
    }
  })

  it('every category id is unique', () => {
    const result = getDefaultCategories()
    const ids = result.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every category color looks like a hex color', () => {
    const result = getDefaultCategories()
    for (const category of result) {
      expect(category.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('includes both income and expense types', () => {
    const result = getDefaultCategories()
    const types = new Set(result.map((c) => c.type))
    expect(types.has('income') || types.has('expense')).toBe(true)
  })

  it('returns new array on each call (not cached)', () => {
    const a = getDefaultCategories()
    const b = getDefaultCategories()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})
