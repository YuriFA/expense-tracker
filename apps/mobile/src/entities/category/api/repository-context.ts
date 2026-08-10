import { createContext, useContext } from 'react'
import type { CategoryRepository } from '@expense-tracker/api'

/** DI seam for the category repository; see `account/api/repository-context`. */
export const CategoryRepositoryContext = createContext<CategoryRepository | null>(null)

export function useCategoryRepository(): CategoryRepository {
  const repo = useContext(CategoryRepositoryContext)
  if (!repo) {
    throw new Error(
      'CategoryRepository is not provided. Wrap the app in <RepositoryProvider>.',
    )
  }
  return repo
}
