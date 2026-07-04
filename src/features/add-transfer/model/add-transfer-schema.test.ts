import { describe, it, expect } from 'vitest'
import { createAddTransferSchema } from './add-transfer-schema'

describe('createAddTransferSchema', () => {
  const schema = createAddTransferSchema()

  it('accepts valid transfer input', () => {
    const result = schema.safeParse({
      type: 'transfer',
      fromAccountId: 'a1',
      toAccountId: 'a2',
      amount: 100,
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional description', () => {
    const result = schema.safeParse({
      type: 'transfer',
      fromAccountId: 'a1',
      toAccountId: 'a2',
      amount: 100,
      description: 'Monthly transfer',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-transfer type', () => {
    const result = schema.safeParse({
      type: 'income',
      fromAccountId: 'a1',
      toAccountId: 'a2',
      amount: 100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty fromAccountId', () => {
    const result = schema.safeParse({
      type: 'transfer',
      fromAccountId: '',
      toAccountId: 'a2',
      amount: 100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty toAccountId', () => {
    const result = schema.safeParse({
      type: 'transfer',
      fromAccountId: 'a1',
      toAccountId: '',
      amount: 100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects when fromAccountId equals toAccountId', () => {
    const result = schema.safeParse({
      type: 'transfer',
      fromAccountId: 'a1',
      toAccountId: 'a1',
      amount: 100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero amount', () => {
    const result = schema.safeParse({
      type: 'transfer',
      fromAccountId: 'a1',
      toAccountId: 'a2',
      amount: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = schema.safeParse({
      type: 'transfer',
      fromAccountId: 'a1',
      toAccountId: 'a2',
      amount: -10,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-number amount', () => {
    const result = schema.safeParse({
      type: 'transfer',
      fromAccountId: 'a1',
      toAccountId: 'a2',
      amount: '100',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing type', () => {
    const result = schema.safeParse({
      fromAccountId: 'a1',
      toAccountId: 'a2',
      amount: 100,
    })
    expect(result.success).toBe(false)
  })

  it('reports error on toAccountId path when accounts are equal', () => {
    const result = schema.safeParse({
      type: 'transfer',
      fromAccountId: 'a1',
      toAccountId: 'a1',
      amount: 100,
    })
    if (result.success) {
      throw new Error('Expected schema to fail')
    }
    const paths = result.error.issues.map((i) => i.path.join('.'))
    expect(paths).toContain('toAccountId')
  })
})
