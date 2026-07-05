import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AccountRef, CategoryRef } from '../model/transaction'
import type { CashflowTransaction, Transaction } from '../model/types'
import { STORAGE_KEYS } from '@/shared/config/storage-keys'
import { createLocalStorageTransactionRepository } from './local-storage-repository'

const accountFixture: AccountRef = { id: 'a1', currency: 'USD' }

const secondAccount: AccountRef = { id: 'a2', currency: 'USD' }

const incomeCategoryFixture: CategoryRef = { id: 'cincome', type: 'income' }

const expenseCategoryFixture: CategoryRef = { id: 'cexpense', type: 'expense' }

const transactionFixture: CashflowTransaction = {
  id: 't1',
  type: 'income',
  amount: 100,
  description: '',
  occurredAt: '2024-01-15T10:00:00Z',
  accountId: 'a1',
  categoryId: 'cincome',
}

function seedTransactions(transactions: Transaction[]) {
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions))
}

function createRepository(
  deps: {
    getAccounts?: () => Promise<AccountRef[]>
    getCategories?: () => Promise<CategoryRef[]>
  } = {},
) {
  return createLocalStorageTransactionRepository({
    getAccounts:
      deps.getAccounts ??
      vi.fn<() => Promise<AccountRef[]>>().mockResolvedValue([accountFixture, secondAccount]),
    getCategories:
      deps.getCategories ??
      vi
        .fn<() => Promise<CategoryRef[]>>()
        .mockResolvedValue([incomeCategoryFixture, expenseCategoryFixture]),
  })
}

describe('transaction localStorage repository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getAll', () => {
    it('returns empty array when storage is empty', async () => {
      const repo = createRepository()
      expect(await repo.getAll()).toEqual([])
    })

    it('returns stored transactions', async () => {
      seedTransactions([transactionFixture])
      const repo = createRepository()
      const result = await repo.getAll()
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('t1')
    })
  })

  describe('getById', () => {
    it('returns null when not found', async () => {
      const repo = createRepository()
      expect(await repo.getById('missing')).toBeNull()
    })

    it('returns matching transaction', async () => {
      seedTransactions([transactionFixture])
      const repo = createRepository()
      const result = await repo.getById('t1')
      expect(result?.id).toBe('t1')
    })
  })

  describe('query', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        type: 'income',
        amount: 100,
        description: '',
        occurredAt: '2024-01-15T10:00:00Z',
        accountId: 'a1',
        categoryId: 'cincome',
      } as never,
      {
        id: 't2',
        type: 'expense',
        amount: 50,
        description: '',
        occurredAt: '2024-02-15T10:00:00Z',
        accountId: 'a2',
        categoryId: 'cexpense',
      } as never,
      {
        id: 't3',
        type: 'transfer',
        amount: 75,
        description: '',
        occurredAt: '2024-03-15T10:00:00Z',
        fromAccountId: 'a1',
        toAccountId: 'a2',
      } as never,
    ]

    beforeEach(() => {
      seedTransactions(transactions)
    })

    it('returns all sorted by occurredAt descending when no filters', async () => {
      const repo = createRepository()
      const result = await repo.query({})
      expect(result.map((t) => t.id)).toEqual(['t3', 't2', 't1'])
    })

    it('filters by fromDate', async () => {
      const repo = createRepository()
      const result = await repo.query({ fromDate: '2024-02-01' })
      expect(result.map((t) => t.id)).toEqual(['t3', 't2'])
    })

    it('filters by toDate', async () => {
      const repo = createRepository()
      const result = await repo.query({ toDate: '2024-02-28' })
      expect(result.map((t) => t.id)).toEqual(['t2', 't1'])
    })

    it('filters by type', async () => {
      const repo = createRepository()
      const result = await repo.query({ type: 'income' })
      expect(result.map((t) => t.id)).toEqual(['t1'])
    })

    it('filters by accountId for cashflow transactions', async () => {
      const repo = createRepository()
      const result = await repo.query({ accountId: 'a1' })
      expect(result.map((t) => t.id)).toEqual(['t3', 't1'])
    })

    it('filters by accountId for transfer endpoints (from or to)', async () => {
      const repo = createRepository()
      const result = await repo.query({ accountId: 'a2' })
      expect(result.map((t) => t.id)).toEqual(['t3', 't2'])
    })

    it('filters by categoryId (cashflow only, never transfer)', async () => {
      const repo = createRepository()
      const expenseResult = await repo.query({ categoryId: 'cexpense' })
      expect(expenseResult.map((t) => t.id)).toEqual(['t2'])

      const incomeResult = await repo.query({ categoryId: 'cincome' })
      expect(incomeResult.map((t) => t.id)).toEqual(['t1'])
    })

    it('applies limit', async () => {
      const repo = createRepository()
      const result = await repo.query({ limit: 2 })
      expect(result).toHaveLength(2)
      expect(result[0]?.id).toBe('t3') // most recent first
    })

    it('combines multiple filters', async () => {
      const repo = createRepository()
      const result = await repo.query({
        fromDate: '2024-01-01',
        toDate: '2024-02-28',
        accountId: 'a1',
      })
      expect(result.map((t) => t.id)).toEqual(['t1'])
    })
  })

  describe('hasTransactionsForAccount', () => {
    it('returns true when cashflow transaction references account', async () => {
      seedTransactions([{ ...transactionFixture, accountId: 'a1' }])
      const repo = createRepository()
      expect(await repo.hasTransactionsForAccount('a1')).toBe(true)
    })

    it('returns true when transfer transaction references account as from or to', async () => {
      seedTransactions([
        {
          id: 't',
          type: 'transfer',
          amount: 100,
          description: '',
          occurredAt: '2024-01-01T00:00:00Z',
          fromAccountId: 'a1',
          toAccountId: 'a2',
        } as never,
      ])
      const repo = createRepository()
      expect(await repo.hasTransactionsForAccount('a1')).toBe(true)
      expect(await repo.hasTransactionsForAccount('a2')).toBe(true)
    })

    it('returns false when no transactions reference account', async () => {
      seedTransactions([{ ...transactionFixture, accountId: 'a1' }])
      const repo = createRepository()
      expect(await repo.hasTransactionsForAccount('a2')).toBe(false)
    })

    it('returns false when storage is empty', async () => {
      const repo = createRepository()
      expect(await repo.hasTransactionsForAccount('a1')).toBe(false)
    })
  })

  describe('hasTransactionsForCategory', () => {
    it('returns true when cashflow transaction references category', async () => {
      seedTransactions([{ ...transactionFixture, categoryId: 'cincome' }])
      const repo = createRepository()
      expect(await repo.hasTransactionsForCategory('cincome')).toBe(true)
    })

    it('returns false when no transactions reference category', async () => {
      seedTransactions([{ ...transactionFixture, categoryId: 'cincome' }])
      const repo = createRepository()
      expect(await repo.hasTransactionsForCategory('cexpense')).toBe(false)
    })
  })

  describe('create', () => {
    it('creates valid cashflow transaction', async () => {
      const repo = createRepository()
      const { id: _omit, ...payload } = transactionFixture
      const result = await repo.create(payload as never)
      expect(result.id).toBeTruthy()
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.transactions) ?? '[]')
      expect(stored).toHaveLength(1)
    })

    it('uses provided id when given', async () => {
      const repo = createRepository()
      const result = await repo.create({ ...transactionFixture, id: 'custom-id' })
      expect(result.id).toBe('custom-id')
    })

    it('creates valid transfer transaction', async () => {
      const repo = createRepository()
      const result = await repo.create({
        id: undefined,
        type: 'transfer',
        amount: 100,
        description: '',
        occurredAt: '2024-01-15T10:00:00Z',
        fromAccountId: 'a1',
        toAccountId: 'a2',
      } as never)
      expect(result.id).toBeTruthy()
    })

    it('throws when payload is invalid', async () => {
      const repo = createRepository()
      // Missing required fields like amount
      await expect(
        repo.create({ type: 'income', accountId: 'a1', categoryId: 'cincome' } as never),
      ).rejects.toThrow(/Invalid transaction payload/)
    })

    it('throws when references are unknown (account)', async () => {
      const repo = createRepository()
      await expect(
        repo.create({ ...transactionFixture, accountId: 'unknown' } as never),
      ).rejects.toThrow(/unknown account or category/)
    })

    it('throws when references are unknown (category)', async () => {
      const repo = createRepository()
      await expect(
        repo.create({ ...transactionFixture, categoryId: 'unknown' } as never),
      ).rejects.toThrow(/unknown account or category/)
    })

    it('throws when cashflow transaction type does not match category type', async () => {
      const repo = createRepository()
      // income transaction with expense category
      await expect(
        repo.create({
          type: 'income',
          categoryId: 'cexpense',
          amount: 100,
          occurredAt: '2024-01-01',
          accountId: 'a1',
          description: '',
        } as never),
      ).rejects.toThrow(/unknown account or category/)
    })
  })

  describe('update', () => {
    it('throws when transaction does not exist', async () => {
      const repo = createRepository()
      await expect(repo.update('missing', { type: 'income' })).rejects.toThrow(
        /Transaction not found/,
      )
    })

    it('throws when updated payload is invalid', async () => {
      seedTransactions([transactionFixture])
      const repo = createRepository()
      await expect(repo.update('t1', { type: 'somenonexisttype' } as never)).rejects.toThrow(
        /Invalid transaction payload/,
      )
    })

    it('updates and persists valid transaction', async () => {
      seedTransactions([transactionFixture])
      const repo = createRepository()
      const result = await repo.update('t1', { amount: 200 })
      expect(result.amount).toBe(200)
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.transactions) ?? '[]')
      expect(stored[0].amount).toBe(200)
    })
  })

  describe('remove', () => {
    it('throws NotFoundError when transaction does not exist', async () => {
      const repo = createRepository()
      await expect(repo.remove('missing')).rejects.toThrow(/not found/)
    })

    it('removes transaction from storage', async () => {
      seedTransactions([transactionFixture, { ...transactionFixture, id: 't2' }])
      const repo = createRepository()
      await repo.remove('t1')
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.transactions) ?? '[]')
      expect(stored).toHaveLength(1)
      expect(stored[0].id).toBe('t2')
    })
  })
})
