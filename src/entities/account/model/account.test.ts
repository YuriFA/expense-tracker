import { describe, it, expect } from 'vitest'
import type { Account } from './types'
import {
  normalizeAccount,
  parseAccountsStorage,
  serializeAccountsStorage,
} from './account'

const accountFixture: Account = {
  id: 'a1',
  name: 'Main',
  currency: 'USD',
  openingBalance: 1000,
  manualAdjustment: 0,
}

describe('normalizeAccount', () => {
  it('returns account for valid input', () => {
    const input = { id: 'a1', name: 'Main', currency: 'USD', openingBalance: 100, manualAdjustment: 0 }
    expect(normalizeAccount(input)).toEqual(input)
  })

  it('returns null when id is missing or empty', () => {
    expect(normalizeAccount({ name: 'Main', currency: 'USD', openingBalance: 0, manualAdjustment: 0 })).toBeNull()
    expect(normalizeAccount({ id: '', name: 'Main', currency: 'USD', openingBalance: 0, manualAdjustment: 0 })).toBeNull()
  })

  it('returns null when name is missing', () => {
    expect(
      normalizeAccount({ id: 'a1', currency: 'USD', openingBalance: 0, manualAdjustment: 0 }),
    ).toBeNull()
  })

  it('returns null when currency is missing', () => {
    expect(
      normalizeAccount({ id: 'a1', name: 'Main', openingBalance: 0, manualAdjustment: 0 }),
    ).toBeNull()
  })

  it('returns null when currency is not a supported code', () => {
    expect(
      normalizeAccount({ id: 'a1', name: 'Main', currency: 'JPY', openingBalance: 0, manualAdjustment: 0 }),
    ).toBeNull()
  })

  it('returns null when openingBalance is not a number', () => {
    expect(
      normalizeAccount({ id: 'a1', name: 'Main', currency: 'USD', openingBalance: 'x', manualAdjustment: 0 }),
    ).toBeNull()
    expect(
      normalizeAccount({ id: 'a1', name: 'Main', currency: 'USD', openingBalance: Infinity, manualAdjustment: 0 }),
    ).toBeNull()
  })

  it('returns null when openingBalance is not an integer', () => {
    expect(
      normalizeAccount({ id: 'a1', name: 'Main', currency: 'USD', openingBalance: 100.5, manualAdjustment: 0 }),
    ).toBeNull()
  })

  it('returns null when manualAdjustment is not a number', () => {
    expect(
      normalizeAccount({ id: 'a1', name: 'Main', currency: 'USD', openingBalance: 0, manualAdjustment: 'x' }),
    ).toBeNull()
  })

  it('returns null when manualAdjustment is not an integer', () => {
    expect(
      normalizeAccount({ id: 'a1', name: 'Main', currency: 'USD', openingBalance: 0, manualAdjustment: 1.5 }),
    ).toBeNull()
  })

  it('returns null for non-record input', () => {
    expect(normalizeAccount(null)).toBeNull()
    expect(normalizeAccount('x')).toBeNull()
    expect(normalizeAccount(42)).toBeNull()
  })
})

describe('parseAccountsStorage', () => {
  it('returns parsed accounts for valid JSON array', () => {
    const input = JSON.stringify([
      { id: 'a1', name: 'Main', currency: 'USD', openingBalance: 100, manualAdjustment: 0 },
    ])
    const result = parseAccountsStorage(input)
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('a1')
    expect(result[0]?.currency).toBe('USD')
  })

  it('returns empty array for non-array JSON', () => {
    expect(parseAccountsStorage(JSON.stringify({ not: 'array' }))).toEqual([])
    expect(parseAccountsStorage(JSON.stringify('string'))).toEqual([])
    expect(parseAccountsStorage(JSON.stringify(42))).toEqual([])
  })

  it('returns empty array for invalid JSON', () => {
    expect(parseAccountsStorage('not valid json')).toEqual([])
  })

  it('skips invalid items but keeps valid ones', () => {
    const input = JSON.stringify([
      { id: 'a1', name: 'Main', currency: 'USD', openingBalance: 100, manualAdjustment: 0 },
      { id: '', name: 'Invalid' }, // missing required fields
      null,
      'not-an-account',
    ])
    const result = parseAccountsStorage(input)
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('a1')
  })
})

describe('serializeAccountsStorage', () => {
  it('returns JSON string for accounts', () => {
    const accounts = [accountFixture]
    const result = serializeAccountsStorage(accounts)
    expect(JSON.parse(result)).toEqual(accounts)
  })

  it('roundtrips via parseAccountsStorage', () => {
    const accounts = [accountFixture]
    const roundtripped = parseAccountsStorage(serializeAccountsStorage(accounts))
    expect(roundtripped).toEqual(accounts)
  })
})
