import { PropsWithChildren, useEffect, useState } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { getDatabase } from '@shared/services/database'
import { useTokens } from '@shared/ui/theme'
import { AccountRepositoryContext } from '@entities/account'
import { CategoryRepositoryContext } from '@entities/category'
import { TransactionRepositoryContext } from '@entities/transaction'
import { createSQLiteAccountRepository } from '@entities/account/api/sqlite-account-repository'
import { createSQLiteCategoryRepository } from '@entities/category/api/sqlite-category-repository'
import { createSQLiteTransactionRepository } from '@entities/transaction/api/sqlite-transaction-repository'
import type {
  AccountRepository,
  CategoryRepository,
} from '@expense-tracker/api'
import type { LocalStorageTransactionRepository } from '@expense-tracker/api'

interface Repositories {
  accounts: AccountRepository
  categories: CategoryRepository
  transactions: LocalStorageTransactionRepository
}

/**
 * Opens the local SQLite database and wires the three SQLite-backed
 * repositories behind their shared DI contexts. Cross-entity dependencies
 * (referential-integrity checks, balance computation over every transaction,
 * transfer-currency validation) are injected by closure, mirroring the web
 * localStorage wiring so the rules match exactly.
 *
 * Default is offline-first (local). The HTTP repository factories from
 * `@expense-tracker/api` (`createHTTP{Account,Category,Transaction}Repository`)
 * remain the swappable alternative behind the same context seam.
 */
export function RepositoryProvider({ children }: PropsWithChildren) {
  const [repos, setRepos] = useState<Repositories | null>(null)
  const tokens = useTokens()

  useEffect(() => {
    let active = true
    void (async () => {
      const db = await getDatabase()

      // Constructed in dependency order; `transactions` references the
      // account/category repos lazily via closure, so it can come first.
      const transactions = createSQLiteTransactionRepository(db, {
        getAccounts: async () => accounts.getAll(),
        getCategories: async () => categories.getAll(),
      })
      const accounts = createSQLiteAccountRepository(db, {
        hasTransactionsForAccount: transactions.hasTransactionsForAccount,
        getAllTransactions: transactions.getAll,
      })
      const categories = createSQLiteCategoryRepository(db, {
        hasTransactionsForCategory: transactions.hasTransactionsForCategory,
      })

      if (active) {
        setRepos({ accounts, categories, transactions })
      }
    })()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!repos) {
    // Minimal boot splash; content areas never show centered spinners per the
    // design, but the very first paint (DB open) is the accepted exception.
    return (
      <View style={[styles.boot, { backgroundColor: tokens.background }]}>
        <ActivityIndicator color={tokens.mutedForeground} />
      </View>
    )
  }

  return (
    <AccountRepositoryContext.Provider value={repos.accounts}>
      <CategoryRepositoryContext.Provider value={repos.categories}>
        <TransactionRepositoryContext.Provider value={repos.transactions}>
          {children}
        </TransactionRepositoryContext.Provider>
      </CategoryRepositoryContext.Provider>
    </AccountRepositoryContext.Provider>
  )
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
