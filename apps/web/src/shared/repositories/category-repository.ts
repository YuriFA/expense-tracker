import type { Category } from '@/entities/category/types'
import type { Repository } from './repository'

export type CreateCategoryPayload = Omit<Category, 'id'> & Partial<Pick<Category, 'id'>>
export type UpdateCategoryPayload = Partial<Omit<Category, 'id'>>

export interface CategoryRepository extends Repository<
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload
> {
  hasReferencingTransactions(categoryId: Category['id']): Promise<boolean>
}
