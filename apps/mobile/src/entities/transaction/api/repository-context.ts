import { createContext, useContext } from 'react'
import type { TransactionRepository } from '@expense-tracker/api'

/** DI seam for the transaction repository; see `account/api/repository-context`. */
export const TransactionRepositoryContext = createContext<TransactionRepository | null>(
  null,
)

export function useTransactionRepository(): TransactionRepository {
  const repo = useContext(TransactionRepositoryContext)
  if (!repo) {
    throw new Error(
      'TransactionRepository is not provided. Wrap the app in <RepositoryProvider>.',
    )
  }
  return repo
}
