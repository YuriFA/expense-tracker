import { describe, it, expect } from 'vitest'
import { createAddAccountSchema } from './add-account-schema'

describe('createAddAccountSchema', () => {
  const schema = createAddAccountSchema()

  it('accepts valid input', () => {
    const result = schema.safeParse({ name: 'Main', currency: 'USD', openingBalance: 100 })
    expect(result.success).toBe(true)
  })

  it('accepts zero openingBalance', () => {
    const result = schema.safeParse({ name: 'Main', currency: 'USD', openingBalance: 0 })
    expect(result.success).toBe(true)
  })

  it('accepts any supported currency code', () => {
    expect(schema.safeParse({ name: 'Main', currency: 'EUR', openingBalance: 0 }).success).toBe(true)
    expect(schema.safeParse({ name: 'Main', currency: 'RUB', openingBalance: 0 }).success).toBe(true)
  })

  it('rejects unsupported currency code', () => {
    const result = schema.safeParse({ name: 'Main', currency: 'JPY', openingBalance: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = schema.safeParse({ name: '', currency: 'USD', openingBalance: 100 })
    expect(result.success).toBe(false)
  })

  it('rejects negative openingBalance', () => {
    const result = schema.safeParse({ name: 'Main', currency: 'USD', openingBalance: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects non-number openingBalance', () => {
    const result = schema.safeParse({ name: 'Main', currency: 'USD', openingBalance: '100' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = schema.safeParse({ currency: 'USD', openingBalance: 100 })
    expect(result.success).toBe(false)
  })

  it('rejects missing currency', () => {
    const result = schema.safeParse({ name: 'Main', openingBalance: 100 })
    expect(result.success).toBe(false)
  })

  it('rejects missing openingBalance', () => {
    const result = schema.safeParse({ name: 'Main', currency: 'USD' })
    expect(result.success).toBe(false)
  })
})
