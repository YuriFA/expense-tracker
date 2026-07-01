import type { AccountRepository } from './account-repository'
import type { CategoryRepository } from './category-repository'
import { createLocalStorageAccountRepository } from './local-storage/local-storage-account-repository'
import { createLocalStorageCategoryRepository } from './local-storage/local-storage-category-repository'
import { createLocalStorageTransactionRepository } from './local-storage/local-storage-transaction-repository'
import type { TransactionRepository } from './transaction-repository'

export interface RepositoryBundle {
  accounts: AccountRepository
  categories: CategoryRepository
  transactions: TransactionRepository
}

let cached: RepositoryBundle | null = null

// if (import.meta.env.VITE_DATA_BACKEND === 'rest') return createRestRepositories()
export function getRepositories(): RepositoryBundle {
  if (cached) {
    return cached
  }

  // eslint-disable-next-line prefer-const
  let accountsRepo: AccountRepository
  // eslint-disable-next-line prefer-const
  let categoriesRepo: CategoryRepository

  const transactions = createLocalStorageTransactionRepository({
    getAccounts: async () => accountsRepo.getAll(),
    getCategories: async () => categoriesRepo.getAll(),
  })
  accountsRepo = createLocalStorageAccountRepository({
    hasTransactionsForAccount: transactions.hasTransactionsForAccount,
    getAllTransactions: transactions.getAll,
  })
  categoriesRepo = createLocalStorageCategoryRepository({
    hasTransactionsForCategory: transactions.hasTransactionsForCategory,
  })

  cached = {
    accounts: accountsRepo,
    categories: categoriesRepo,
    transactions,
  }
  return cached
}
