import { vi, type MockedFunction } from 'vitest'
import type { AccountRepository } from '@/entities/account/repository'
import type { CategoryRepository } from '@/entities/category/repository'
import type { TransactionRepository } from '@/entities/transaction/repository'

export type MockedAccountRepository = {
  [K in keyof AccountRepository]: MockedFunction<AccountRepository[K]>
}
export type MockedCategoryRepository = {
  [K in keyof CategoryRepository]: MockedFunction<CategoryRepository[K]>
}
export type MockedTransactionRepository = {
  [K in keyof TransactionRepository]: MockedFunction<TransactionRepository[K]>
}

export function createMockAccountRepository(
  overrides: Partial<MockedAccountRepository> = {},
): MockedAccountRepository {
  return {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    hasReferencingTransactions: vi.fn(),
    ...overrides,
  }
}

export function createMockCategoryRepository(
  overrides: Partial<MockedCategoryRepository> = {},
): MockedCategoryRepository {
  return {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    hasReferencingTransactions: vi.fn(),
    ...overrides,
  }
}

export function createMockTransactionRepository(
  overrides: Partial<MockedTransactionRepository> = {},
): MockedTransactionRepository {
  return {
    getAll: vi.fn(),
    getById: vi.fn(),
    query: vi.fn(),
    hasTransactionsForAccount: vi.fn(),
    hasTransactionsForCategory: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  }
}

export function createMockRepositoryBundle() {
  return {
    accounts: createMockAccountRepository(),
    categories: createMockCategoryRepository(),
    transactions: createMockTransactionRepository(),
  }
}
