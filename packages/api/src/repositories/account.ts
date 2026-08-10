import type { Account, AccountWithBalance } from '../domain/account'
import type { Repository } from '../repository'

export type CreateAccountPayload = Omit<Account, 'id' | 'manualAdjustment'> &
  Partial<Pick<Account, 'id'>>
export type UpdateAccountPayload = Partial<Omit<Account, 'id' | 'currency' | 'openingBalance'>>

export type AccountRepository = Repository<
  AccountWithBalance,
  CreateAccountPayload,
  UpdateAccountPayload
>
