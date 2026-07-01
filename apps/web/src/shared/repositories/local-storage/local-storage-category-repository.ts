import { useLocalStorageRef, type LocalStorageSerializer } from './local-storage-adapter'
import { STORAGE_KEYS } from './storage-keys'
import type { Category } from '@/entities/category/types'
import { parseCategoriesStorage, serializeCategoriesStorage } from '@/entities/category/category'
import type {
  CategoryRepository,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../category-repository'
import { getDefaultCategories } from '@/entities/category/defaults'
import { generateId } from '@/shared/lib/generate-id'

const serializer: LocalStorageSerializer<Category[]> = {
  read: parseCategoriesStorage,
  write: serializeCategoriesStorage,
}

export function createLocalStorageCategoryRepository(deps: {
  hasTransactionsForCategory: (categoryId: string) => Promise<boolean>
}): CategoryRepository {
  const userItems = useLocalStorageRef<Category[]>({
    storageKey: STORAGE_KEYS.categories,
    initialValue: getDefaultCategories(),
    serializer,
  })

  return {
    async getAll() {
      return [...getDefaultCategories(), ...userItems.value]
    },
    async getUserCategories() {
      return userItems.value.slice()
    },
    async getById(id: string) {
      return [...getDefaultCategories(), ...userItems.value].find((item) => item.id === id) ?? null
    },
    async create(payload: CreateCategoryPayload) {
      const category: Category = {
        ...payload,
        id: payload.id ?? generateId(),
      }
      userItems.value.push(category)
      return category
    },
    async update(id, payload: UpdateCategoryPayload) {
      const target = userItems.value.find((item) => item.id === id)

      if (!target) {
        throw new Error(`Category with id ${id} not found`)
      }

      return Object.assign(target, payload)
    },
    async remove(id) {
      if (await deps.hasTransactionsForCategory(id)) {
        return false
      }
      const next = userItems.value.filter((item) => item.id !== id)
      if (next.length === userItems.value.length) {
        return false
      }

      userItems.value = next
      return true
    },
    async hasReferencingTransactions(categoryId) {
      return deps.hasTransactionsForCategory(categoryId)
    },
  }
}
