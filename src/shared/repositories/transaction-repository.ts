import type { Transaction, TransactionType } from '@/entities/transaction/types'
import type { Repository } from './repository'
import type { CalendarDay } from '../lib/date'

export type CreateTransactionPayload = Omit<Transaction, 'id'> & Partial<Pick<Transaction, 'id'>>
export type UpdateTransactionPayload = Partial<Omit<Transaction, 'id'>>

export interface TransactionQuery {
  limit?: number
  type?: TransactionType
  accountId?: string
  categoryId?: string
  fromDate?: CalendarDay
  toDate?: CalendarDay
}

export interface TransactionRepository extends Repository<
  Transaction,
  CreateTransactionPayload,
  UpdateTransactionPayload
> {
  query(options: TransactionQuery): Promise<Transaction[]>
  hasTransactionsForAccount(accountId: string): Promise<boolean>
  hasTransactionsForCategory(categoryId: string): Promise<boolean>
}
