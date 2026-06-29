import type { Account } from '@/entities/account/types'
import type { Repository } from './repository'

export type CreateAccountPayload = Omit<Account, 'id' | 'manualAdjustment'> &
  Partial<Pick<Account, 'id'>>
export type UpdateAccountPayload = Partial<Omit<Account, 'id'>>

export interface AccountRepository extends Repository<
  Account,
  CreateAccountPayload,
  UpdateAccountPayload
> {
  hasReferencingTransactions(accountId: Account['id']): Promise<boolean>
}
