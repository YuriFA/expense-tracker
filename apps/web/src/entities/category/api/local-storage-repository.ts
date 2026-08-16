import { STORAGE_KEYS } from '@/shared/config/storage-keys'
import type { Category } from '../model/types'
import { parseCategoriesStorage, serializeCategoriesStorage } from '../model/category'
import type { CategoryRepository, CreateCategoryPayload, UpdateCategoryPayload } from './repository'
import { generateId } from '@/shared/lib/generate-id'
import {
  createLocalStorageAdapter,
  NotFoundError,
  ReferentialIntegrityError,
  VersionConflictError,
} from '@/shared/lib/data'
import { DEFAULT_CATEGORIES } from '../model/defaults'

const categoriesStorage = createLocalStorageAdapter<Category[]>(STORAGE_KEYS.categories, [], {
  read: parseCategoriesStorage,
  write: serializeCategoriesStorage,
})

// Bundled defaults are immutable fixtures; they carry version 1 like any
// seeded server record.
function withDefaults(): Category[] {
  return [...DEFAULT_CATEGORIES.map((c) => ({ ...c, version: 1 })), ...categoriesStorage.get()]
}

export function createLocalStorageCategoryRepository(deps: {
  hasTransactionsForCategory: (categoryId: string) => Promise<boolean>
}): CategoryRepository {
  return {
    async getAll() {
      return withDefaults()
    },
    async getById(id: string) {
      return withDefaults().find((item) => item.id === id) ?? null
    },
    async create(payload: CreateCategoryPayload) {
      const category: Category = {
        ...payload,
        id: payload.id ?? generateId(),
        version: 1,
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
      if (payload.version !== target.version) {
        throw new VersionConflictError('Category was modified concurrently', {
          apiCode: 'CATEGORY_VERSION_CONFLICT',
        })
      }

      const { version: _cas, ...fields } = payload
      return Object.assign(target, fields, { version: target.version + 1 })
    },
    async remove(id) {
      if (await deps.hasTransactionsForCategory(id)) {
        throw new ReferentialIntegrityError(`Category has referencing transactions`)
      }
      const categories = categoriesStorage.get()
      const next = categories.filter((item) => item.id !== id)
      if (next.length === categories.length) {
        throw new NotFoundError(`Category not found`)
      }

      categoriesStorage.set(next)
    },
  }
}
