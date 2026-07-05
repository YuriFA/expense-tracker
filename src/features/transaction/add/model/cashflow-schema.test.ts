import { describe, it, expect } from 'vitest'
import { createCashflowSchema } from './cashflow-schema'

describe('createCashflowSchema', () => {
  const schema = createCashflowSchema()

  it('accepts valid income input', () => {
    const result = schema.safeParse({
      type: 'income',
      accountId: 'a1',
      amount: 100,
      categoryId: 'c1',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid expense input', () => {
    const result = schema.safeParse({
      type: 'expense',
      accountId: 'a1',
      amount: 50,
      categoryId: 'c1',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional description', () => {
    const result = schema.safeParse({
      type: 'income',
      accountId: 'a1',
      amount: 100,
      categoryId: 'c1',
      description: 'Salary',
    })
    expect(result.success).toBe(true)
  })

  it('rejects transfer type (not in enum)', () => {
    const result = schema.safeParse({
      type: 'transfer',
      accountId: 'a1',
      amount: 100,
      categoryId: 'c1',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty accountId', () => {
    const result = schema.safeParse({ type: 'income', accountId: '', amount: 100, categoryId: 'c1' })
    expect(result.success).toBe(false)
  })

  it('rejects empty categoryId', () => {
    const result = schema.safeParse({ type: 'income', accountId: 'a1', amount: 100, categoryId: '' })
    expect(result.success).toBe(false)
  })

  it('rejects zero amount', () => {
    const result = schema.safeParse({ type: 'income', accountId: 'a1', amount: 0, categoryId: 'c1' })
    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = schema.safeParse({
      type: 'income',
      accountId: 'a1',
      amount: -1,
      categoryId: 'c1',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing type', () => {
    const result = schema.safeParse({ accountId: 'a1', amount: 100, categoryId: 'c1' })
    expect(result.success).toBe(false)
  })

  it('rejects non-number amount', () => {
    const result = schema.safeParse({
      type: 'income',
      accountId: 'a1',
      amount: '100',
      categoryId: 'c1',
    })
    expect(result.success).toBe(false)
  })
})
