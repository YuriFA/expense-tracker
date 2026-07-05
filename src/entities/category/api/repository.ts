import { inject, type InjectionKey } from 'vue'
import type { Category } from '../model/types'
import type { Repository } from '@/shared/lib/data'

export type CreateCategoryPayload = Omit<Category, 'id'> & Partial<Pick<Category, 'id'>>
export type UpdateCategoryPayload = Partial<Omit<Category, 'id'>>

export type CategoryRepository = Repository<Category, CreateCategoryPayload, UpdateCategoryPayload>

export const CATEGORY_REPOSITORY_KEY: InjectionKey<CategoryRepository> =
  Symbol('category-repository')

export function useCategoryRepository(): CategoryRepository {
  const repo = inject(CATEGORY_REPOSITORY_KEY)
  if (!repo) {
    throw new Error('CategoryRepository not provided. Call provideRepositories(app) in main.ts.')
  }
  return repo
}
