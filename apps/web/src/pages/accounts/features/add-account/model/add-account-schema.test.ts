import { describe, it, expect } from 'vitest'
import { createAddAccountSchema } from './add-account-schema'

describe('createAddAccountSchema', () => {
  const schema = createAddAccountSchema()

  it('accepts valid input', () => {
    const result = schema.safeParse({ name: 'Main', openingBalance: 100 })
    expect(result.success).toBe(true)
  })

  it('accepts zero openingBalance', () => {
    const result = schema.safeParse({ name: 'Main', openingBalance: 0 })
    expect(result.success).toBe(true)
  })

  // currency-rub-only: currency left the form model (the submit mapper
  // hardwires DEFAULT_CURRENCY); a stale currency key must not pass through.
  it('strips a currency key instead of validating it', () => {
    const result = schema.safeParse({ name: 'Main', openingBalance: 0, currency: 'EUR' })
    expect(result.success).toBe(true)
    if (result.success) expect('currency' in result.data).toBe(false)
  })

  it('rejects empty name', () => {
    const result = schema.safeParse({ name: '', openingBalance: 100 })
    expect(result.success).toBe(false)
  })

  it('rejects negative openingBalance', () => {
    const result = schema.safeParse({ name: 'Main', openingBalance: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects non-number openingBalance', () => {
    const result = schema.safeParse({ name: 'Main', openingBalance: '100' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = schema.safeParse({ openingBalance: 100 })
    expect(result.success).toBe(false)
  })

  it('rejects missing openingBalance', () => {
    const result = schema.safeParse({ name: 'Main' })
    expect(result.success).toBe(false)
  })
})
