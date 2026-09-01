import type { Account, AccountWithBalance } from '../domain/account'
import type { Repository } from '../repository'

export type CreateAccountPayload = Omit<Account, 'id' | 'version'> &
  Partial<Pick<Account, 'id'>>
export type UpdateAccountPayload = Partial<Omit<Account, 'id' | 'currency' | 'openingBalance' | 'version'>> & {
  /** Optimistic-concurrency CAS token: the version the caller previously read. */
  version: number
}

export type AccountRepository = Repository<
  AccountWithBalance,
  CreateAccountPayload,
  UpdateAccountPayload
>
