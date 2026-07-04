import type { Account } from '@/entities/account'
import type { Category } from '@/entities/category'
import {
  hasValidTransactionReferences,
  isTransaction,
  isTransactionLinkedToAccount,
  isTransactionLinkedToCategory,
  isTransferTransaction,
  normalizeTransaction,
  parseTransactionsStorage,
  serializeTransactionsStorage,
} from './transaction'
import { describe, expect, it } from 'vitest'
import type { CashflowTransaction, Transaction, TransferTransaction } from './types'

const incomeTransaction: CashflowTransaction = {
  id: 't1',
  type: 'income',
  amount: 100,
  description: '',
  occurredAt: '2024-01-01T00:00:00Z',
  accountId: 'a1',
  categoryId: 'cincome',
}

const expenseTransaction: CashflowTransaction = {
  id: 't2',
  type: 'expense',
  amount: 50,
  description: '',
  occurredAt: '2024-01-02T00:00:00Z',
  accountId: 'a1',
  categoryId: 'cexpense',
}

const transferTransaction: TransferTransaction = {
  id: 't3',
  type: 'transfer',
  amount: 75,
  description: '',
  occurredAt: '2024-01-03T00:00:00Z',
  fromAccountId: 'a1',
  toAccountId: 'a2',
}

const accounts: Account[] = [
  { id: 'a1', name: 'Account 1', openingBalance: 1000, manualAdjustment: 0 },
  { id: 'a2', name: 'Account 2', openingBalance: 500, manualAdjustment: 0 },
]

const categories: Category[] = [
  { id: 'cincome', name: 'Salary', type: 'income', icon: '💰', color: '#00FF00' },
  { id: 'cexpense', name: 'Food', type: 'expense', icon: '🍔', color: '#FF0000' },
]

describe('isTransaction', () => {
  it('returns true for valid income transaction', () => {
    expect(isTransaction(incomeTransaction)).toBe(true)
  })

  it('returns true for valid expense transaction', () => {
    expect(isTransaction(expenseTransaction)).toBe(true)
  })

  it('returns true for valid transfer transaction', () => {
    expect(isTransaction(transferTransaction)).toBe(true)
  })

  it('returns false for invalid amount type', () => {
    expect(
      isTransaction({ ...incomeTransaction, amount: '100' as unknown as number }),
    ).toBe(false)
  })

  it('returns false for missing required cashflow fields', () => {
    const { accountId, ...withoutAccountId } = incomeTransaction
    void accountId
    expect(isTransaction(withoutAccountId)).toBe(false)
  })

  it('returns false for transfer with same from and to account', () => {
    expect(
      isTransaction({ ...transferTransaction, toAccountId: 'a1' }),
    ).toBe(false)
  })

  it('returns false for non-record input', () => {
    expect(isTransaction(null)).toBe(false)
    expect(isTransaction('not a record')).toBe(false)
    expect(isTransaction(42)).toBe(false)
  })
})

describe('isTransferTransaction', () => {
  it('returns true for transfer transaction', () => {
    expect(isTransferTransaction(transferTransaction)).toBe(true)
  })

  it('returns false for non-transfer transaction', () => {
    expect(isTransferTransaction(incomeTransaction)).toBe(false)
    expect(isTransferTransaction(expenseTransaction)).toBe(false)
  })
})

describe('isTransactionLinkedToAccount', () => {
  it('returns true for cashflow transaction linked to its account', () => {
    expect(isTransactionLinkedToAccount(incomeTransaction, 'a1')).toBe(true)
  })

  it('returns false for cashflow transaction not linked to the given account', () => {
    expect(isTransactionLinkedToAccount(incomeTransaction, 'a2')).toBe(false)
  })

  it('returns true for transfer linked via fromAccountId', () => {
    expect(isTransactionLinkedToAccount(transferTransaction, 'a1')).toBe(true)
  })

  it('returns true for transfer linked via toAccountId', () => {
    expect(isTransactionLinkedToAccount(transferTransaction, 'a2')).toBe(true)
  })

  it('returns false for transfer when account is neither from nor to', () => {
    expect(isTransactionLinkedToAccount(transferTransaction, 'a3')).toBe(false)
  })
})

describe('isTransactionLinkedToCategory', () => {
  it('returns true for cashflow transaction linked to its category', () => {
    expect(isTransactionLinkedToCategory(incomeTransaction, 'cincome')).toBe(true)
  })

  it('returns false for cashflow transaction not linked to the given category', () => {
    expect(isTransactionLinkedToCategory(incomeTransaction, 'cexpense')).toBe(false)
  })

  it('returns false for transfer transaction (transfers have no category)', () => {
    expect(isTransactionLinkedToCategory(transferTransaction, 'cincome')).toBe(false)
    expect(isTransactionLinkedToCategory(transferTransaction, 'any-id')).toBe(false)
  })
})

describe('hasValidTransactionReferences', () => {
  it('returns true for valid income transaction with matching category type', () => {
    expect(hasValidTransactionReferences(incomeTransaction, accounts, categories)).toBe(true)
  })

  it('returns true for valid expense transaction with matching category type', () => {
    expect(hasValidTransactionReferences(expenseTransaction, accounts, categories)).toBe(true)
  })

  it('returns false when cashflow account does not exist', () => {
    expect(
      hasValidTransactionReferences(
        { ...incomeTransaction, accountId: 'unknown' },
        accounts,
        categories,
      ),
    ).toBe(false)
  })

  it('returns false when cashflow category does not exist', () => {
    expect(
      hasValidTransactionReferences(
        { ...incomeTransaction, categoryId: 'unknown' },
        accounts,
        categories,
      ),
    ).toBe(false)
  })

  it('returns false when cashflow type does not match category type', () => {
    // income transaction referencing an expense category
    expect(
      hasValidTransactionReferences(
        { ...incomeTransaction, categoryId: 'cexpense' },
        accounts,
        categories,
      ),
    ).toBe(false)
  })

  it('returns true for valid transfer with both accounts existing', () => {
    expect(hasValidTransactionReferences(transferTransaction, accounts, categories)).toBe(true)
  })

  it('returns false for transfer when fromAccount does not exist', () => {
    expect(
      hasValidTransactionReferences(
        { ...transferTransaction, fromAccountId: 'unknown' },
        accounts,
        categories,
      ),
    ).toBe(false)
  })

  it('returns false for transfer when toAccount does not exist', () => {
    expect(
      hasValidTransactionReferences(
        { ...transferTransaction, toAccountId: 'unknown' },
        accounts,
        categories,
      ),
    ).toBe(false)
  })

  it('returns false for transfer with same from and to account', () => {
    expect(
      hasValidTransactionReferences(
        { ...transferTransaction, toAccountId: 'a1' },
        accounts,
        categories,
      ),
    ).toBe(false)
  })
})

describe('normalizeTransaction', () => {
  it('returns null for non-record input', () => {
    expect(normalizeTransaction(null)).toBeNull()
    expect(normalizeTransaction('not a record')).toBeNull()
    expect(normalizeTransaction(42)).toBeNull()
  })

  it('returns null for empty object', () => {
    expect(normalizeTransaction({})).toBeNull()
  })

  it('returns null for invalid type', () => {
    expect(normalizeTransaction({ ...incomeTransaction, type: 'invalid' })).toBeNull()
  })

  it('returns null for non-positive amount', () => {
    expect(normalizeTransaction({ ...incomeTransaction, amount: 0 })).toBeNull()
    expect(normalizeTransaction({ ...incomeTransaction, amount: -1 })).toBeNull()
  })

  it('returns null for non-number amount', () => {
    expect(
      normalizeTransaction({ ...incomeTransaction, amount: '100' as unknown as number }),
    ).toBeNull()
  })

  it('returns null for invalid occurredAt', () => {
    expect(normalizeTransaction({ ...incomeTransaction, occurredAt: 'not a date' })).toBeNull()
  })

  it('returns null for valid base but missing cashflow fields', () => {
    const { accountId, ...withoutAccountId } = incomeTransaction
    void accountId
    expect(normalizeTransaction(withoutAccountId)).toBeNull()
  })

  it('returns null for valid base but empty accountId', () => {
    expect(normalizeTransaction({ ...incomeTransaction, accountId: '' })).toBeNull()
  })

  it('returns null for valid base but empty categoryId', () => {
    expect(normalizeTransaction({ ...incomeTransaction, categoryId: '' })).toBeNull()
  })

  it('returns normalized income transaction', () => {
    expect(normalizeTransaction(incomeTransaction)).toEqual(incomeTransaction)
  })

  it('returns normalized expense transaction', () => {
    expect(normalizeTransaction(expenseTransaction)).toEqual(expenseTransaction)
  })

  it('returns normalized transfer transaction', () => {
    expect(normalizeTransaction(transferTransaction)).toEqual(transferTransaction)
  })

  it('returns null for transfer with missing fromAccountId', () => {
    expect(
      normalizeTransaction({ ...transferTransaction, fromAccountId: '' }),
    ).toBeNull()
  })

  it('returns null for transfer with missing toAccountId', () => {
    expect(
      normalizeTransaction({ ...transferTransaction, toAccountId: '' }),
    ).toBeNull()
  })

  it('returns null for transfer with same from and to account', () => {
    expect(
      normalizeTransaction({ ...transferTransaction, toAccountId: 'a1' }),
    ).toBeNull()
  })

  it('preserves optional updatedAt when valid', () => {
    const withUpdate = { ...incomeTransaction, updatedAt: '2024-01-02T00:00:00Z' }
    expect(normalizeTransaction(withUpdate)).toEqual(withUpdate)
  })

  it('returns null when updatedAt is present but invalid', () => {
    expect(
      normalizeTransaction({ ...incomeTransaction, updatedAt: 'not a date' }),
    ).toBeNull()
  })
})

describe('parseTransactionsStorage', () => {
  it('parses valid storage data into transactions', () => {
    const storageData = JSON.stringify([incomeTransaction, expenseTransaction, transferTransaction])
    expect(parseTransactionsStorage(storageData)).toEqual([
      incomeTransaction,
      expenseTransaction,
      transferTransaction,
    ])
  })

  it('returns empty array for empty array storage', () => {
    expect(parseTransactionsStorage('[]')).toEqual([])
  })

  it('returns empty array for invalid JSON', () => {
    expect(parseTransactionsStorage('not valid json')).toEqual([])
  })

  it('returns empty array for non-array JSON', () => {
    expect(parseTransactionsStorage(JSON.stringify({ key: 'value' }))).toEqual([])
    expect(parseTransactionsStorage(JSON.stringify('string'))).toEqual([])
    expect(parseTransactionsStorage(JSON.stringify(42))).toEqual([])
  })

  it('returns empty array for empty string input', () => {
    expect(parseTransactionsStorage('')).toEqual([])
  })

  it('skips invalid items but keeps valid ones', () => {
    const storageData = JSON.stringify([
      incomeTransaction,
      { id: '', type: 'income' }, // invalid
      null,
      'not a record',
      transferTransaction,
    ])
    const result = parseTransactionsStorage(storageData)
    expect(result).toEqual([incomeTransaction, transferTransaction])
  })
})

describe('serializeTransactionsStorage', () => {
  it('serializes transactions array to JSON string', () => {
    const transactions: Transaction[] = [incomeTransaction, expenseTransaction, transferTransaction]
    expect(serializeTransactionsStorage(transactions)).toBe(JSON.stringify(transactions))
  })

  it('serializes empty array', () => {
    expect(serializeTransactionsStorage([])).toBe('[]')
  })

  it('roundtrips via parseTransactionsStorage', () => {
    const transactions: Transaction[] = [incomeTransaction, transferTransaction]
    const roundtripped = parseTransactionsStorage(serializeTransactionsStorage(transactions))
    expect(roundtripped).toEqual(transactions)
  })
})
