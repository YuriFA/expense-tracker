import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Account } from '../model/types'
import type { Transaction } from '@/entities/transaction'
import { STORAGE_KEYS } from '@/shared/config/storage-keys'
import { createLocalStorageAccountRepository } from './local-storage-repository'

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

function seedAccounts(accounts: Account[]) {
  localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(accounts))
}

function createRepository(deps: {
  hasTransactionsForAccount?: (accountId: string) => Promise<boolean>
  getAllTransactions?: () => Promise<Transaction[]>
} = {}) {
  return createLocalStorageAccountRepository({
    hasTransactionsForAccount:
      deps.hasTransactionsForAccount ?? (vi.fn<() => Promise<boolean>>().mockResolvedValue(false) as never),
    getAllTransactions:
      deps.getAllTransactions ?? (vi.fn<() => Promise<Transaction[]>>().mockResolvedValue([]) as never),
  })
}

describe('account localStorage repository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getAll', () => {
    it('returns empty array when storage is empty', async () => {
      const repo = createRepository()
      const result = await repo.getAll()
      expect(result).toEqual([])
    })

    it('returns accounts with computed balances', async () => {
      seedAccounts([accountFixture])
      const repo = createRepository({
        getAllTransactions: vi.fn<() => Promise<Transaction[]>>().mockResolvedValue([incomeTransaction]),
      })
      const result = await repo.getAll()
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('a1')
      expect(result[0]?.balance).toBe(1100)
    })

    it('falls back to opening + manual when account has no transactions', async () => {
      seedAccounts([{ ...accountFixture, openingBalance: 200, manualAdjustment: 50 }])
      const repo = createRepository()
      const result = await repo.getAll()
      expect(result[0]?.balance).toBe(250)
    })
  })

  describe('getById', () => {
    it('returns null when account is not found', async () => {
      const repo = createRepository()
      expect(await repo.getById('missing')).toBeNull()
    })

    it('returns account with computed balance when found', async () => {
      seedAccounts([accountFixture])
      const repo = createRepository({
        getAllTransactions: vi.fn<() => Promise<Transaction[]>>().mockResolvedValue([incomeTransaction]),
      })
      const result = await repo.getById('a1')
      expect(result?.id).toBe('a1')
      expect(result?.balance).toBe(1100)
    })
  })

  describe('create', () => {
    it('creates account with provided id', async () => {
      const repo = createRepository()
      const result = await repo.create({
        id: 'custom',
        name: 'Main',
        openingBalance: 100,
      })
      expect(result.id).toBe('custom')
      expect(result.balance).toBe(100)
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.accounts) ?? '[]')
      expect(stored).toHaveLength(1)
      expect(stored[0].id).toBe('custom')
      expect(stored[0].manualAdjustment).toBe(0)
    })

    it('generates id when not provided', async () => {
      const repo = createRepository()
      const result = await repo.create({ name: 'Main', openingBalance: 100 })
      expect(result.id).toBeTruthy()
      expect(typeof result.id).toBe('string')
    })
  })

  describe('update', () => {
    it('throws when account does not exist', async () => {
      const repo = createRepository()
      await expect(repo.update('missing', { name: 'New' })).rejects.toThrow(/not found/)
    })

    it('updates fields and recalculates balance', async () => {
      seedAccounts([accountFixture])
      const repo = createRepository({
        getAllTransactions: vi.fn<() => Promise<Transaction[]>>().mockResolvedValue([incomeTransaction]),
      })
      const result = await repo.update('a1', { name: 'Updated', manualAdjustment: 50 })
      expect(result.name).toBe('Updated')
      expect(result.manualAdjustment).toBe(50)
      expect(result.balance).toBe(1150)
    })
  })

  describe('remove', () => {
    it('throws ReferentialIntegrityError when account has transactions', async () => {
      seedAccounts([accountFixture])
      const repo = createRepository({
        hasTransactionsForAccount: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
      })
      await expect(repo.remove('a1')).rejects.toThrow(/referencing transactions/)
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.accounts) ?? '[]')
      expect(stored).toHaveLength(1)
    })

    it('throws NotFoundError when account does not exist', async () => {
      const repo = createRepository()
      await expect(repo.remove('missing')).rejects.toThrow(/not found/)
    })

    it('removes account when no transactions reference it', async () => {
      seedAccounts([accountFixture, { ...accountFixture, id: 'a2' }])
      const repo = createRepository({
        hasTransactionsForAccount: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
      })
      await repo.remove('a1')
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.accounts) ?? '[]')
      expect(stored).toHaveLength(1)
      expect(stored[0].id).toBe('a2')
    })
  })

  describe('hasReferencingTransactions', () => {
    it('delegates to injected dep', async () => {
      const dep = vi.fn<() => Promise<boolean>>().mockResolvedValue(true)
      const repo = createRepository({ hasTransactionsForAccount: dep })
      expect(await repo.hasReferencingTransactions('a1')).toBe(true)
      expect(dep).toHaveBeenCalledWith('a1')
    })
  })
})
