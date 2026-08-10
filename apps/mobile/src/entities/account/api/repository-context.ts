import { createContext, useContext } from 'react'
import type { AccountRepository } from '@expense-tracker/api'

/**
 * DI seam for the account repository. The app provider wires a concrete impl
 * (local SQLite by default; the HTTP impl from `@expense-tracker/api` is the
 * swappable alternative) and exposes it through this context. Downstream
 * consumers (react-query hooks, screens) read it via `useAccountRepository`.
 */
export const AccountRepositoryContext = createContext<AccountRepository | null>(null)

export function useAccountRepository(): AccountRepository {
  const repo = useContext(AccountRepositoryContext)
  if (!repo) {
    throw new Error(
      'AccountRepository is not provided. Wrap the app in <RepositoryProvider>.',
    )
  }
  return repo
}
