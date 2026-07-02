import { describe, it, expect } from 'vitest'
import type { Account } from './types'
import type { Transaction } from '@/entities/transaction/types'
import {
  getAccountsBalances,
  getComputedAccountBalance,
  getTransactionImpactForAccount,
  normalizeAccount,
  parseAccountsStorage,
  serializeAccountsStorage,
  sumTransactionsImpactForAccount,
} from './account'

const accountFixture: Account = {
  id: 'a1',
  name: 'Main',
  openingBalance: 1000,
  manualAdjustment: 0,
}

const incomeTransaction: Transaction = {
  id: 't1',
  type: 'income',
  amount: 100,
  description: '',
  occurredAt: '2024-01-01T00:00:00Z',
  accountId: 'a1',
  categoryId: 'c1',
} as never

const expenseTransaction: Transaction = {
  id: 't2',
  type: 'expense',
  amount: 50,
  description: '',
  occurredAt: '2024-01-02T00:00:00Z',
  accountId: 'a1',
  categoryId: 'c1',
} as never

const transferTransaction: Transaction = {
  id: 't3',
  type: 'transfer',
  amount: 75,
  description: '',
  occurredAt: '2024-01-03T00:00:00Z',
  fromAccountId: 'a1',
  toAccountId: 'a2',
} as never

describe('getTransactionImpactForAccount', () => {
  it('returns +amount for income on this account', () => {
    expect(getTransactionImpactForAccount(incomeTransaction, 'a1')).toBe(100)
  })

  it('returns 0 for income on another account', () => {
    expect(getTransactionImpactForAccount(incomeTransaction, 'a2')).toBe(0)
  })

  it('returns -amount for expense on this account', () => {
    expect(getTransactionImpactForAccount(expenseTransaction, 'a1')).toBe(-50)
  })

  it('returns 0 for expense on another account', () => {
    expect(getTransactionImpactForAccount(expenseTransaction, 'a2')).toBe(0)
  })

  it('returns -amount for transfer from this account', () => {
    expect(getTransactionImpactForAccount(transferTransaction, 'a1')).toBe(-75)
  })

  it('returns +amount for transfer to this account', () => {
    expect(getTransactionImpactForAccount(transferTransaction, 'a2')).toBe(75)
  })

  it('returns 0 for transfer on unrelated account', () => {
    const transfer: Transaction = {
      id: 't',
      type: 'transfer',
      amount: 100,
      description: '',
      occurredAt: '2024-01-01T00:00:00Z',
      fromAccountId: 'a1',
      toAccountId: 'a2',
    } as never
    expect(getTransactionImpactForAccount(transfer, 'a3')).toBe(0)
  })
})

describe('sumTransactionsImpactForAccount', () => {
  it('sums impacts across transactions', () => {
    const transactions = [incomeTransaction, expenseTransaction]
    expect(sumTransactionsImpactForAccount(transactions, 'a1')).toBe(50)
  })

  it('returns 0 for empty list', () => {
    expect(sumTransactionsImpactForAccount([], 'a1')).toBe(0)
  })
})

describe('getAccountsBalances', () => {
  it('returns opening + manualAdjustment without transactions', () => {
    const result = getAccountsBalances(
      [{ ...accountFixture, openingBalance: 100, manualAdjustment: 50 }],
      [],
    )
    expect(result).toEqual({ a1: 150 })
  })

  it('applies income transactions to account', () => {
    const result = getAccountsBalances([accountFixture], [incomeTransaction])
    expect(result.a1).toBe(1100)
  })

  it('applies expense transactions to account', () => {
    const result = getAccountsBalances([accountFixture], [expenseTransaction])
    expect(result.a1).toBe(950)
  })

  it('applies transfer transactions (both endpoints)', () => {
    const accounts = [accountFixture, { ...accountFixture, id: 'a2' }]
    const result = getAccountsBalances(accounts, [transferTransaction])
    expect(result.a1).toBe(925)
    expect(result.a2).toBe(1075)
  })

  it('ignores transactions for unknown account ids', () => {
    const accounts = [accountFixture]
    const unknownIncome: Transaction = {
      id: 't',
      type: 'income',
      amount: 100,
      description: '',
      occurredAt: '2024-01-01T00:00:00Z',
      accountId: 'unknown',
      categoryId: 'c1',
    } as never
    const result = getAccountsBalances(accounts, [unknownIncome])
    expect(result.a1).toBe(1000)
  })
})

describe('getComputedAccountBalance', () => {
  it('returns opening + manual + sum of impacts', () => {
    const account: Account = {
      id: 'a1',
      name: 'Main',
      openingBalance: 1000,
      manualAdjustment: 100,
    }
    const result = getComputedAccountBalance(account, [incomeTransaction])
    expect(result).toBe(1200)
  })
})

describe('normalizeAccount', () => {
  it('returns account for valid input', () => {
    const input = { id: 'a1', name: 'Main', openingBalance: 100, manualAdjustment: 0 }
    expect(normalizeAccount(input)).toEqual(input)
  })

  it('returns null when id is missing or empty', () => {
    expect(normalizeAccount({ name: 'Main', openingBalance: 0, manualAdjustment: 0 })).toBeNull()
    expect(normalizeAccount({ id: '', name: 'Main', openingBalance: 0, manualAdjustment: 0 })).toBeNull()
  })

  it('returns null when name is missing', () => {
    expect(
      normalizeAccount({ id: 'a1', openingBalance: 0, manualAdjustment: 0 }),
    ).toBeNull()
  })

  it('returns null when openingBalance is not a number', () => {
    expect(
      normalizeAccount({ id: 'a1', name: 'Main', openingBalance: 'x', manualAdjustment: 0 }),
    ).toBeNull()
    expect(
      normalizeAccount({ id: 'a1', name: 'Main', openingBalance: Infinity, manualAdjustment: 0 }),
    ).toBeNull()
  })

  it('returns null when manualAdjustment is not a number', () => {
    expect(
      normalizeAccount({ id: 'a1', name: 'Main', openingBalance: 0, manualAdjustment: 'x' }),
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
      { id: 'a1', name: 'Main', openingBalance: 100, manualAdjustment: 0 },
    ])
    const result = parseAccountsStorage(input)
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('a1')
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
      { id: 'a1', name: 'Main', openingBalance: 100, manualAdjustment: 0 },
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
