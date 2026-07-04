import { inject, type InjectionKey } from 'vue'
import type { Transaction, TransactionType } from '../model/types'
import type { Repository } from '@/shared/lib/data'
import type { CalendarDay } from '@/shared/lib/date'

export type CreateTransactionPayload<T extends Transaction = Transaction> = Omit<T, 'id'> &
  Partial<Pick<T, 'id'>>
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

export const TRANSACTION_REPOSITORY_KEY: InjectionKey<TransactionRepository> = Symbol('transaction-repository')

export function useTransactionRepository(): TransactionRepository {
  const repo = inject(TRANSACTION_REPOSITORY_KEY)
  if (!repo) {
    throw new Error('TransactionRepository not provided. Call provideRepositories(app) in main.ts.')
  }
  return repo
}
