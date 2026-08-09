import { inject, type InjectionKey } from 'vue'
import type { Transaction, TransactionType } from '../model/types'
import type { Repository } from '@/shared/lib/data'
import type { CalendarDay } from '@/shared/lib/date'

export type CreateTransactionPayload<T extends Transaction = Transaction> = T extends Transaction
  ? Omit<T, 'id' | 'version'> & Partial<Pick<T, 'id'>>
  : never
// PATCH /transactions/{id} requires `version` (optimistic concurrency).
export type UpdateTransactionPayload<T extends Transaction = Transaction> = T extends Transaction
  ? Partial<Omit<T, 'id' | 'version'>> & { version: number }
  : never

export interface TransactionQuery {
  limit?: number
  type?: TransactionType
  accountId?: string
  categoryId?: string
  fromDate?: CalendarDay
  toDate?: CalendarDay
}

/** A single cursor-paginated page from `GET /transactions`. */
export interface TransactionPage {
  transactions: Transaction[]
  /** Opaque cursor for the next page; `null` when there are no more pages. */
  nextCursor: string | null
}

export interface TransactionRepository
  extends Repository<Transaction, CreateTransactionPayload, UpdateTransactionPayload> {
  query(options: TransactionQuery): Promise<Transaction[]>
  /** Fetches one page of transactions following the backend's cursor. */
  listPage(options: TransactionQuery & { cursor?: string }): Promise<TransactionPage>
}

/**
 * Extended surface exposed only by the localStorage dev-only repository: it can
 * simulate the backend's `409 *_IN_USE` by checking whether a resource is
 * referenced. The HTTP repository does NOT have these (the backend surfaces
 * "in use" only as a 409 on DELETE).
 */
export type LocalStorageTransactionRepository = TransactionRepository & {
  hasTransactionsForAccount(accountId: string): Promise<boolean>
  hasTransactionsForCategory(categoryId: string): Promise<boolean>
}

export const TRANSACTION_REPOSITORY_KEY: InjectionKey<TransactionRepository> =
  Symbol('transaction-repository')

export function useTransactionRepository(): TransactionRepository {
  const repo = inject(TRANSACTION_REPOSITORY_KEY)
  if (!repo) {
    throw new Error('TransactionRepository not provided. Call provideRepositories(app) in main.ts.')
  }
  return repo
}
