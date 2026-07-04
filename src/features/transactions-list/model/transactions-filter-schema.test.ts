import { describe, it, expect } from 'vitest'
import { createTransactionsFilterSchema } from './transactions-filter-schema'

describe('createTransactionsFilterSchema', () => {
  const schema = createTransactionsFilterSchema()

  it('accepts empty object (all fields optional)', () => {
    const result = schema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts all valid fields populated', () => {
    const result = schema.safeParse({
      fromDate: new Date('2024-01-01'),
      toDate: new Date('2024-01-31'),
      type: 'expense',
      accountId: 'a1',
      categoryId: 'c1',
    })
    expect(result.success).toBe(true)
  })

  it('accepts partial input', () => {
    const result = schema.safeParse({ type: 'income' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid type', () => {
    const result = schema.safeParse({ type: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('rejects empty accountId', () => {
    const result = schema.safeParse({ accountId: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty categoryId', () => {
    const result = schema.safeParse({ categoryId: '' })
    expect(result.success).toBe(false)
  })

  it('rejects non-date fromDate', () => {
    const result = schema.safeParse({ fromDate: '2024-01-01' })
    expect(result.success).toBe(false)
  })
})
