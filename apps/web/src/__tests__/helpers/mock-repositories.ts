import { vi, type MockedFunction } from 'vitest'
import type { AccountRepository } from '@/entities/account'
import type { CategoryRepository } from '@/entities/category'
import type { TransactionRepository } from '@/entities/transaction'

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
    getAll: vi.fn<AccountRepository['getAll']>(),
    getById: vi.fn<AccountRepository['getById']>(),
    create: vi.fn<AccountRepository['create']>(),
    update: vi.fn<AccountRepository['update']>(),
    remove: vi.fn<AccountRepository['remove']>(),
    ...overrides,
  }
}

export function createMockCategoryRepository(
  overrides: Partial<MockedCategoryRepository> = {},
): MockedCategoryRepository {
  return {
    getAll: vi.fn<CategoryRepository['getAll']>(),
    getById: vi.fn<CategoryRepository['getById']>(),
    create: vi.fn<CategoryRepository['create']>(),
    update: vi.fn<CategoryRepository['update']>(),
    remove: vi.fn<CategoryRepository['remove']>(),
    ...overrides,
  }
}

export function createMockTransactionRepository(
  overrides: Partial<MockedTransactionRepository> = {},
): MockedTransactionRepository {
  return {
    getAll: vi.fn<TransactionRepository['getAll']>(),
    getById: vi.fn<TransactionRepository['getById']>(),
    query: vi.fn<TransactionRepository['query']>(),
    hasTransactionsForAccount: vi.fn<TransactionRepository['hasTransactionsForAccount']>(),
    hasTransactionsForCategory: vi.fn<TransactionRepository['hasTransactionsForCategory']>(),
    create: vi.fn<TransactionRepository['create']>(),
    update: vi.fn<TransactionRepository['update']>(),
    remove: vi.fn<TransactionRepository['remove']>(),
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
