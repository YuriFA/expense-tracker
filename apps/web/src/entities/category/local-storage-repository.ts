import { STORAGE_KEYS } from '@/shared/config/storage-keys'
import type { Category } from './types'
import { parseCategoriesStorage, serializeCategoriesStorage } from './category'
import type {
  CategoryRepository,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from './repository'
import { getDefaultCategories } from './defaults'
import { generateId } from '@/shared/lib/generate-id'
import { createLocalStorageAdapter } from '@/shared/lib/data/local-storage-adapter'
import { NotFoundError, ReferentialIntegrityError } from '@/shared/lib/data/repository'

const categoriesStorage = createLocalStorageAdapter<Category[]>(STORAGE_KEYS.categories, [], {
  read: parseCategoriesStorage,
  write: serializeCategoriesStorage,
})

export function createLocalStorageCategoryRepository(deps: {
  hasTransactionsForCategory: (categoryId: string) => Promise<boolean>
}): CategoryRepository {
  return {
    async getAll() {
      return [...getDefaultCategories(), ...categoriesStorage.get()]
    },
    async getById(id: string) {
      return [...getDefaultCategories(), ...categoriesStorage.get()].find((item) => item.id === id) ?? null
    },
    async create(payload: CreateCategoryPayload) {
      const category: Category = {
        ...payload,
        id: payload.id ?? generateId(),
      }
      const categories = categoriesStorage.get()
      categories.push(category)
      categoriesStorage.set(categories)
      return category
    },
    async update(id, payload: UpdateCategoryPayload) {
      const categories = categoriesStorage.get()
      const target = categories.find((item) => item.id === id)

      if (!target) {
        throw new NotFoundError('Category not found')
      }

      return Object.assign(target, payload)
    },
    async remove(id) {
      if (await deps.hasTransactionsForCategory(id)) {
        throw new ReferentialIntegrityError(
          `Category has referencing transactions`,
        )
      }
      const categories = categoriesStorage.get()
      const next = categories.filter((item) => item.id !== id)
      if (next.length === categories.length) {
        throw new NotFoundError(`Category not found`)
      }

      categoriesStorage.set(next)
    },
    async hasReferencingTransactions(categoryId) {
      return deps.hasTransactionsForCategory(categoryId)
    },
  }
}
