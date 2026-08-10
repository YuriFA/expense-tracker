// Public API of the account entity slice.
//
// Domain types + repository contract come from `@expense-tracker/api`; this
// slice contributes the SQLite implementation, the DI context, and the
// react-query hooks. Downward imports only (shared / package).

export type {
  Account,
  AccountWithBalance,
  AccountRepository,
  CreateAccountPayload,
  UpdateAccountPayload,
} from '@expense-tracker/api'

export { AccountRepositoryContext, useAccountRepository } from './api/repository-context'
export { createSQLiteAccountRepository } from './api/sqlite-account-repository'
export {
  accountKeys,
  useAccounts,
  useAccount,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from './model/use-accounts'
export { AccountChips } from './ui/AccountChips'
