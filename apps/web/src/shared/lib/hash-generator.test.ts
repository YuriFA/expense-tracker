import { describe, it, expect } from 'vitest'
import { generateHashIndex } from './hash-generator'

describe('generateHashIndex', () => {
  it('returns a number in range [1, 16]', () => {
    for (let i = 0; i < 100; i++) {
      const value = `test-${i}`
      const index = generateHashIndex(value)
      expect(index).toBeGreaterThanOrEqual(1)
      expect(index).toBeLessThanOrEqual(16)
      expect(Number.isInteger(index)).toBe(true)
    }
  })

  it('is deterministic for same input', () => {
    expect(generateHashIndex('account-1')).toBe(generateHashIndex('account-1'))
  })

  it('returns different indices for different inputs across many samples', () => {
    const indices = new Set(Array.from({ length: 50 }, (_, i) => generateHashIndex(`unique-${i}`)))
    expect(indices.size).toBeGreaterThan(1)
  })

  it('handles empty string', () => {
    const index = generateHashIndex('')
    expect(index).toBeGreaterThanOrEqual(1)
    expect(index).toBeLessThanOrEqual(16)
  })
})
