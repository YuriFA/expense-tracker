import { describe, it, expect } from 'vitest'
import { createJoinByCodeSchema } from './join-by-code-schema'

describe('createJoinByCodeSchema', () => {
  const schema = createJoinByCodeSchema()

  it('accepts a valid code', () => {
    expect(schema.safeParse({ code: 'ABCD2345' }).success).toBe(true)
  })

  it('trims and uppercases before validating', () => {
    expect(schema.safeParse({ code: '  abcd2345 ' }).success).toBe(true)
  })

  it('normalizes the parsed value to trimmed uppercase', () => {
    const result = schema.safeParse({ code: ' abcd2345 ' })
    expect(result).toMatchObject({ success: true, data: { code: 'ABCD2345' } })
  })

  it('rejects ambiguous alphabet characters (0, O, 1, I)', () => {
    expect(schema.safeParse({ code: 'ABCD0234' }).success).toBe(false)
    expect(schema.safeParse({ code: 'ABCD0O34' }).success).toBe(false)
    expect(schema.safeParse({ code: 'AB2D1C45' }).success).toBe(false)
    expect(schema.safeParse({ code: 'ABCDI345' }).success).toBe(false)
  })

  it('rejects wrong length', () => {
    expect(schema.safeParse({ code: 'ABCD234' }).success).toBe(false)
    expect(schema.safeParse({ code: 'ABCD23456' }).success).toBe(false)
  })

  it('rejects empty and non-string codes', () => {
    expect(schema.safeParse({ code: '' }).success).toBe(false)
    expect(schema.safeParse({}).success).toBe(false)
  })
})
