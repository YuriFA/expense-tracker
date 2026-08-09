import type { App } from 'vue'
import {
  ACCOUNT_REPOSITORY_KEY,
  createHTTPAccountRepository,
  createLocalStorageAccountRepository,
  type AccountRepository,
} from '@/entities/account'
import {
  CATEGORY_REPOSITORY_KEY,
  createHTTPCategoryRepository,
  createLocalStorageCategoryRepository,
  type CategoryRepository,
} from '@/entities/category'
import {
  createHTTPTransactionRepository,
  createLocalStorageTransactionRepository,
  TRANSACTION_REPOSITORY_KEY,
  type LocalStorageTransactionRepository,
  type TransactionRepository,
} from '@/entities/transaction'

export type RepositoryVariant = 'http' | 'localStorage'

/**
 * Production defaults to the HTTP client (the real backend). Set
 * `VITE_REPO_VARIANT=localStorage` for the dev-only offline mode that persists
 * to the browser instead of calling the API.
 */
export function provideRepositories(
  app: App,
  variant: RepositoryVariant = (import.meta.env.VITE_REPO_VARIANT ?? 'http') as RepositoryVariant,
): void {
  let accounts: AccountRepository
  let categories: CategoryRepository
  let transactions: TransactionRepository

  if (variant === 'http') {
    transactions = createHTTPTransactionRepository()
    accounts = createHTTPAccountRepository()
    categories = createHTTPCategoryRepository()
  } else {
    // The localStorage transaction repository exposes the extra "in use"
    // simulation surface so account/category delete can mirror the backend's
    // 409 *_IN_USE without a phantom endpoint.
    const localStorageTransactions = createLocalStorageTransactionRepository({
      getAccounts: async () => accounts.getAll(),
      getCategories: async () => categories.getAll(),
    })
    transactions = localStorageTransactions
    accounts = createLocalStorageAccountRepository({
      hasTransactionsForAccount: localStorageTransactions.hasTransactionsForAccount,
      getAllTransactions: localStorageTransactions.getAll,
    })
    categories = createLocalStorageCategoryRepository({
      hasTransactionsForCategory: localStorageTransactions.hasTransactionsForCategory,
    })
  }

  app.provide(ACCOUNT_REPOSITORY_KEY, accounts)
  app.provide(CATEGORY_REPOSITORY_KEY, categories)
  app.provide(TRANSACTION_REPOSITORY_KEY, transactions)
}
