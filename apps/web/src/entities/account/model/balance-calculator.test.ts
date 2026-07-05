import { describe, it, expect } from 'vitest'
import type { Account } from '../model/types'
import {
  getAccountsBalances,
  getComputedAccountBalance,
  getTransactionImpactForAccount,
  sumTransactionsImpactForAccount,
} from './balance-calculator'

const accountFixture: Account = {
  id: 'a1',
  name: 'Main',
  currency: 'USD',
  openingBalance: 1000,
  manualAdjustment: 0,
}

const incomeTransaction = {
  id: 't1',
  type: 'income' as const,
  amount: 100,
  description: '',
  occurredAt: '2024-01-01T00:00:00Z',
  accountId: 'a1',
  categoryId: 'c1',
}

const expenseTransaction = {
  id: 't2',
  type: 'expense' as const,
  amount: 50,
  description: '',
  occurredAt: '2024-01-02T00:00:00Z',
  accountId: 'a1',
  categoryId: 'c1',
}

const transferTransaction = {
  id: 't3',
  type: 'transfer' as const,
  amount: 75,
  description: '',
  occurredAt: '2024-01-03T00:00:00Z',
  fromAccountId: 'a1',
  toAccountId: 'a2',
}

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
    const transfer = {
      id: 't',
      type: 'transfer' as const,
      amount: 100,
      description: '',
      occurredAt: '2024-01-01T00:00:00Z',
      fromAccountId: 'a1',
      toAccountId: 'a2',
    }
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
    const unknownIncome = {
      id: 't',
      type: 'income' as const,
      amount: 100,
      description: '',
      occurredAt: '2024-01-01T00:00:00Z',
      accountId: 'unknown',
      categoryId: 'c1',
    }
    const result = getAccountsBalances(accounts, [unknownIncome])
    expect(result.a1).toBe(1000)
  })
})

describe('getComputedAccountBalance', () => {
  it('returns opening + manual + sum of impacts', () => {
    const account: Account = {
      id: 'a1',
      name: 'Main',
      currency: 'USD',
      openingBalance: 1000,
      manualAdjustment: 100,
    }
    const result = getComputedAccountBalance(account, [incomeTransaction])
    expect(result).toBe(1200)
  })
})
