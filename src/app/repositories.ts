import type { App } from 'vue'
import { ACCOUNT_REPOSITORY_KEY, type AccountRepository } from '@/entities/account'
import { CATEGORY_REPOSITORY_KEY, type CategoryRepository } from '@/entities/category'
import { TRANSACTION_REPOSITORY_KEY, type TransactionRepository } from '@/entities/transaction'
import { createLocalStorageAccountRepository } from '@/entities/account'
import { createLocalStorageCategoryRepository } from '@/entities/category'
import { createLocalStorageTransactionRepository } from '@/entities/transaction'
import { createHTTPTransactionRepository } from '@/entities/transaction/api/http-repository'
import { createHTTPCategoryRepository } from '@/entities/category/api/http-repository'
import { createHTTPAccountRepository } from '@/entities/account/api/http-repository'

export type RepositoryVariant = 'http' | 'localStorage'

export function provideRepositories(
  app: App,
  variant: RepositoryVariant = (import.meta.env.VITE_REPO_VARIANT ?? 'localStorage') as RepositoryVariant,
): void {
  let accounts: AccountRepository
  let categories: CategoryRepository
  let transactions: TransactionRepository

  if (variant === 'http') {
    transactions = createHTTPTransactionRepository()
    accounts = createHTTPAccountRepository()
    categories = createHTTPCategoryRepository()
  } else {
    transactions = createLocalStorageTransactionRepository({
      getAccounts: async () => accounts.getAll(),
      getCategories: async () => categories.getAll(),
    })
    accounts = createLocalStorageAccountRepository({
      hasTransactionsForAccount: transactions.hasTransactionsForAccount,
      getAllTransactions: transactions.getAll,
    })
    categories = createLocalStorageCategoryRepository({
      hasTransactionsForCategory: transactions.hasTransactionsForCategory,
    })
  }

  app.provide(ACCOUNT_REPOSITORY_KEY, accounts)
  app.provide(CATEGORY_REPOSITORY_KEY, categories)
  app.provide(TRANSACTION_REPOSITORY_KEY, transactions)
}
