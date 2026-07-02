import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Category } from './types'
import { STORAGE_KEYS } from '@/shared/config/storage-keys'
import { createLocalStorageCategoryRepository } from './local-storage-repository'

const categoryFixture: Category = {
  id: 'c1',
  name: 'Food',
  type: 'expense',
  icon: '🍔',
  color: '#FF0000',
}

function seedCategories(categories: Category[]) {
  localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories))
}

function createRepository(deps: {
  hasTransactionsForCategory?: (categoryId: string) => Promise<boolean>
} = {}) {
  return createLocalStorageCategoryRepository({
    hasTransactionsForCategory:
      deps.hasTransactionsForCategory ?? (vi.fn<() => Promise<boolean>>().mockResolvedValue(false) as never),
  })
}

describe('category localStorage repository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getAll', () => {
    it('returns default categories when storage is empty', async () => {
      const repo = createRepository()
      const result = await repo.getAll()
      expect(result.length).toBeGreaterThan(0)
      // Default categories come from defaults.ts
    })

    it('merges defaults with stored categories', async () => {
      seedCategories([categoryFixture])
      const repo = createRepository()
      const result = await repo.getAll()
      // Defaults plus our fixture
      expect(result.length).toBeGreaterThan(1)
      expect(result.some((c) => c.id === 'c1')).toBe(true)
    })
  })

  describe('getById', () => {
    it('returns category from defaults', async () => {
      const repo = createRepository()
      const all = await repo.getAll()
      const defaultCategory = all[0]
      const result = await repo.getById(defaultCategory!.id)
      expect(result?.id).toBe(defaultCategory!.id)
    })

    it('returns stored category', async () => {
      seedCategories([categoryFixture])
      const repo = createRepository()
      const result = await repo.getById('c1')
      expect(result?.id).toBe('c1')
    })

    it('returns null when category is not found', async () => {
      const repo = createRepository()
      expect(await repo.getById('non-existent-id')).toBeNull()
    })
  })

  describe('create', () => {
    it('creates category with provided id', async () => {
      const repo = createRepository()
      const result = await repo.create({
        id: 'custom',
        name: 'Custom',
        type: 'expense',
        icon: '🎯',
        color: '#00FF00',
      })
      expect(result.id).toBe('custom')
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.categories) ?? '[]')
      expect(stored).toHaveLength(1)
      expect(stored[0].id).toBe('custom')
    })

    it('generates id when not provided', async () => {
      const repo = createRepository()
      const result = await repo.create({
        name: 'Custom',
        type: 'expense',
        icon: '🎯',
        color: '#00FF00',
      })
      expect(result.id).toBeTruthy()
    })
  })

  describe('update', () => {
    it('throws when category does not exist', async () => {
      const repo = createRepository()
      await expect(repo.update('missing', { name: 'New' })).rejects.toThrow(/not found/)
    })

    it('updates fields in place', async () => {
      seedCategories([categoryFixture])
      const repo = createRepository()
      const result = await repo.update('c1', { name: 'Updated' })
      expect(result.name).toBe('Updated')
    })
  })

  describe('remove', () => {
    it('returns false when category has transactions', async () => {
      seedCategories([categoryFixture])
      const repo = createRepository({
        hasTransactionsForCategory: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
      })
      expect(await repo.remove('c1')).toBe(false)
    })

    it('returns false when category does not exist', async () => {
      const repo = createRepository()
      expect(await repo.remove('missing')).toBe(false)
    })

    it('removes category when no transactions reference it', async () => {
      seedCategories([categoryFixture, { ...categoryFixture, id: 'c2' }])
      const repo = createRepository({
        hasTransactionsForCategory: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
      })
      expect(await repo.remove('c1')).toBe(true)
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.categories) ?? '[]')
      expect(stored).toHaveLength(1)
      expect(stored[0].id).toBe('c2')
    })

    it('does not remove default categories (they are not in storage)', async () => {
      const repo = createRepository({
        hasTransactionsForCategory: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
      })
      const defaults = await repo.getAll()
      const defaultId = defaults[0]!.id
      const result = await repo.remove(defaultId)
      // Default categories are not in storage, so storage removal finds nothing
      expect(result).toBe(false)
    })
  })

  describe('hasReferencingTransactions', () => {
    it('delegates to injected dep', async () => {
      const dep = vi.fn<() => Promise<boolean>>().mockResolvedValue(true)
      const repo = createRepository({ hasTransactionsForCategory: dep })
      expect(await repo.hasReferencingTransactions('c1')).toBe(true)
      expect(dep).toHaveBeenCalledWith('c1')
    })
  })
})
