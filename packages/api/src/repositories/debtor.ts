import type { Debtor } from '../domain/debtor'
import type { Repository } from '../repository'

export type CreateDebtorPayload = Pick<Debtor, 'name'> & {
  /** Optional note; absent means an empty string on the server. */
  note?: string
} & Partial<Pick<Debtor, 'id'>>
export type UpdateDebtorPayload = Partial<Pick<Debtor, 'name' | 'note'>> & {
  /** Optimistic-concurrency CAS token: the version the caller previously read. */
  version: number
}

export type DebtorRepository = Repository<Debtor, CreateDebtorPayload, UpdateDebtorPayload>
