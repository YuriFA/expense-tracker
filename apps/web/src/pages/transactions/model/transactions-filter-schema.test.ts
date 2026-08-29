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
      accountId: ['a1', 'a2'],
      categoryId: ['c1'],
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

  it('rejects an accountId list with an empty id', () => {
    const result = schema.safeParse({ accountId: ['a1', ''] })
    expect(result.success).toBe(false)
  })

  it('rejects an empty categoryId string (not a list)', () => {
    const result = schema.safeParse({ categoryId: '' })
    expect(result.success).toBe(false)
  })

  it('rejects non-date fromDate', () => {
    const result = schema.safeParse({ fromDate: '2024-01-01' })
    expect(result.success).toBe(false)
  })
})
