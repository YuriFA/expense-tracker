export { CategoryRepositoryProvider, useCategoryRepository } from './api/repository'
export { createLocalCategoryRepository } from '@expense-tracker/local-data'
export {
  useCategories,
  useCategoriesIncludingArchived,
  useCreateCategory,
  useUpdateCategory,
} from './model/use-categories'
export type { Category } from './model/use-categories'
export {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON,
} from './config/category-appearance'
