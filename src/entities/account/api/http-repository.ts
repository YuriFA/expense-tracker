import { api } from '@/shared/api'
import type { AccountWithBalance } from '../model/types'
import type { AccountRepository, CreateAccountPayload, UpdateAccountPayload } from './repository'

export function createHTTPAccountRepository(): AccountRepository {
  return {
    async getAll() {
      return api<AccountWithBalance[]>('/accounts')
    },
    async getById(id: string) {
      return api<AccountWithBalance | null>(`/accounts/${id}`)
    },
    async create(payload: CreateAccountPayload) {
      return api<AccountWithBalance>('/accounts', { method: 'POST', body: payload })
    },
    async update(id, payload: UpdateAccountPayload) {
      return api<AccountWithBalance>(`/accounts/${id}`, { method: 'PUT', body: payload })
    },
    async remove(id) {
      await api<void>(`/accounts/${id}`, { method: 'DELETE' })
    },
  }
}
