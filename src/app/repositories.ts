import type { App } from 'vue'
import { ACCOUNT_REPOSITORY_KEY, type AccountRepository } from '@/entities/account/repository'
import {
  CATEGORY_REPOSITORY_KEY,
  type CategoryRepository,
} from '@/entities/category/repository'
import { TRANSACTION_REPOSITORY_KEY } from '@/entities/transaction/repository'
import { createLocalStorageAccountRepository } from '@/entities/account/local-storage-repository'
import { createLocalStorageCategoryRepository } from '@/entities/category/local-storage-repository'
import { createLocalStorageTransactionRepository } from '@/entities/transaction/local-storage-repository'

export function provideRepositories(app: App): void {
  // eslint-disable-next-line prefer-const
  let accounts: AccountRepository
  // eslint-disable-next-line prefer-const
  let categories: CategoryRepository

  const transactions = createLocalStorageTransactionRepository({
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

  app.provide(ACCOUNT_REPOSITORY_KEY, accounts)
  app.provide(CATEGORY_REPOSITORY_KEY, categories)
  app.provide(TRANSACTION_REPOSITORY_KEY, transactions)
}
