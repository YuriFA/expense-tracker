import type { Category } from '../domain/category'
import type { Repository } from '../repository'

export type CreateCategoryPayload = Omit<Category, 'id'> & Partial<Pick<Category, 'id'>>
export type UpdateCategoryPayload = Partial<Omit<Category, 'id'>>

export type CategoryRepository = Repository<Category, CreateCategoryPayload, UpdateCategoryPayload>
