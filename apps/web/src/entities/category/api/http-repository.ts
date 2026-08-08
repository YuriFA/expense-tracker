import { api } from '@/shared/api'
import type { Category } from '../model/types'
import type { CategoryRepository, CreateCategoryPayload, UpdateCategoryPayload } from './repository'

export function createHTTPCategoryRepository(): CategoryRepository {
  return {
    async getAll() {
      return api<Category[]>('/categories')
    },
    async getById(id: string) {
      return api<Category | null>(`/categories/${id}`)
    },
    async create(payload: CreateCategoryPayload) {
      return api<Category>('/categories', { method: 'POST', body: payload })
    },
    async update(id, payload: UpdateCategoryPayload) {
      return api<Category>(`/categories/${id}`, { method: 'PUT', body: payload })
    },
    async remove(id) {
      await api<void>(`/categories/${id}`, { method: 'DELETE' })
    },
  }
}
