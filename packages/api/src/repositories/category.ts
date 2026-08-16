import type { Category } from '../domain/category'
import type { Repository } from '../repository'

export type CreateCategoryPayload = Omit<Category, 'id' | 'version'> &
  Partial<Pick<Category, 'id'>>
export type UpdateCategoryPayload = Partial<Omit<Category, 'id' | 'version'>> & {
  /** Optimistic-concurrency CAS token: the version the caller previously read. */
  version: number
}

export type CategoryRepository = Repository<Category, CreateCategoryPayload, UpdateCategoryPayload>
