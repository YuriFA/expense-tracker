import { describe, it, expect } from 'vitest'
import type { Category } from './types'
import {
  normalizeCategory,
  parseCategoriesStorage,
  serializeCategoriesStorage,
} from './category'

const validCategory: Category = {
  id: 'c1',
  name: 'Food',
  type: 'expense',
  icon: '🍔',
  color: '#FF0000',
}

describe('normalizeCategory', () => {
  it('returns category for valid input', () => {
    expect(normalizeCategory(validCategory)).toEqual(validCategory)
  })

  it('returns null when id is missing or empty', () => {
    expect(normalizeCategory({ ...validCategory, id: '' })).toBeNull()
    expect(normalizeCategory({ name: 'Food', type: 'expense', icon: 'x', color: 'y' })).toBeNull()
  })

  it('returns null when name is missing', () => {
    expect(normalizeCategory({ id: 'c1', type: 'expense', icon: 'x', color: 'y' })).toBeNull()
  })

  it('returns null when type is invalid', () => {
    expect(normalizeCategory({ ...validCategory, type: 'invalid' as never })).toBeNull()
  })

  it('returns null when icon is missing', () => {
    expect(normalizeCategory({ id: 'c1', name: 'Food', type: 'expense', color: 'y' })).toBeNull()
  })

  it('returns null when color is missing', () => {
    expect(normalizeCategory({ id: 'c1', name: 'Food', type: 'expense', icon: 'x' })).toBeNull()
  })

  it('returns null for non-record input', () => {
    expect(normalizeCategory(null)).toBeNull()
    expect(normalizeCategory('x')).toBeNull()
    expect(normalizeCategory(42)).toBeNull()
  })
})

describe('parseCategoriesStorage', () => {
  it('returns parsed categories for valid JSON array', () => {
    const input = JSON.stringify([validCategory])
    expect(parseCategoriesStorage(input)).toEqual([validCategory])
  })

  it('returns empty array for non-array JSON', () => {
    expect(parseCategoriesStorage(JSON.stringify({ not: 'array' }))).toEqual([])
    expect(parseCategoriesStorage(JSON.stringify('string'))).toEqual([])
    expect(parseCategoriesStorage(JSON.stringify(42))).toEqual([])
  })

  it('returns empty array for invalid JSON', () => {
    expect(parseCategoriesStorage('not valid json')).toEqual([])
  })

  it('skips invalid items but keeps valid ones', () => {
    const input = JSON.stringify([
      validCategory,
      { id: '', name: 'Invalid' },
      null,
      'not-a-category',
    ])
    const result = parseCategoriesStorage(input)
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('c1')
  })
})

describe('serializeCategoriesStorage', () => {
  it('returns JSON string for categories', () => {
    const result = serializeCategoriesStorage([validCategory])
    expect(JSON.parse(result)).toEqual([validCategory])
  })

  it('roundtrips via parseCategoriesStorage', () => {
    const categories = [validCategory]
    const roundtripped = parseCategoriesStorage(serializeCategoriesStorage(categories))
    expect(roundtripped).toEqual(categories)
  })
})
