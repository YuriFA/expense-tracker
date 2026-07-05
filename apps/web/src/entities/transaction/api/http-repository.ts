import { api } from '@/shared/api'
import type { Transaction } from '../model/types'
import type {
  CreateTransactionPayload,
  TransactionQuery,
  TransactionRepository,
  UpdateTransactionPayload,
} from './repository'

export function createHTTPTransactionRepository(): TransactionRepository {
  return {
    async getAll() {
      return api<Transaction[]>('/transactions')
    },
    async getById(id: string) {
      return api<Transaction | null>(`/transactions/${id}`)
    },
    async query(options: TransactionQuery = {}) {
      return api<Transaction[]>('/transactions', { query: options })
    },
    async hasTransactionsForAccount(accountId: string) {
      return api<boolean>(`/accounts/${accountId}/has-transactions`)
    },
    async hasTransactionsForCategory(categoryId: string) {
      return api<boolean>(`/categories/${categoryId}/has-transactions`)
    },
    async create(payload: CreateTransactionPayload) {
      return api<Transaction>('/transactions', { method: 'POST', body: payload })
    },
    async update(id, payload: UpdateTransactionPayload) {
      return api<Transaction>(`/transactions/${id}`, { method: 'PUT', body: payload })
    },
    async remove(id) {
      await api<void>(`/transactions/${id}`, { method: 'DELETE' })
    },
  }
}
