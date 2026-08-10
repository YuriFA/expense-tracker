// Public API of the category entity slice.

export type {
  Category,
  CategoryType,
  CategoryRepository,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '@expense-tracker/api'

export { CategoryRepositoryContext, useCategoryRepository } from './api/repository-context'
export { createSQLiteCategoryRepository } from './api/sqlite-category-repository'
export {
  categoryKeys,
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from './model/use-categories'
