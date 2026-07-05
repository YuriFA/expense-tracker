import { inject, type InjectionKey } from 'vue'
import type { Account, AccountWithBalance } from '../model/types'
import type { Repository } from '@/shared/lib/data'

export type CreateAccountPayload = Omit<Account, 'id' | 'manualAdjustment'> &
  Partial<Pick<Account, 'id'>>
export type UpdateAccountPayload = Partial<Omit<Account, 'id' | 'currency'>>

export type AccountRepository = Repository<
  AccountWithBalance,
  CreateAccountPayload,
  UpdateAccountPayload
>

export const ACCOUNT_REPOSITORY_KEY: InjectionKey<AccountRepository> = Symbol('account-repository')

export function useAccountRepository(): AccountRepository {
  const repo = inject(ACCOUNT_REPOSITORY_KEY)
  if (!repo) {
    throw new Error('AccountRepository not provided. Call provideRepositories(app) in main.ts.')
  }
  return repo
}
