import type { CalendarDay } from '../lib/datetime'
import type { Repository } from '../repository'
import type { Transaction, TransactionType } from '../domain/transaction'

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
 * Extended surface exposed only by app-local dev repositories (e.g. the web
 * localStorage variant): it can simulate the backend's `409 *_IN_USE` by
 * checking whether a resource is referenced. The HTTP repository does NOT have
 * these (the backend surfaces "in use" only as a 409 on DELETE).
 */
export type LocalStorageTransactionRepository = TransactionRepository & {
  hasTransactionsForAccount(accountId: string): Promise<boolean>
  hasTransactionsForCategory(categoryId: string): Promise<boolean>
}
