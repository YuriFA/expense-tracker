import { describe, it, expect } from 'vitest'
import { generateId } from './generate-id'

describe('generateId', () => {
  it('returns unique values across many calls', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateId()))
    expect(ids.size).toBe(1000)
  })
})
