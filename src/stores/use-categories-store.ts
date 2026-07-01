import { defineStore } from 'pinia'

import type { Category } from '@/entities/category/types'
import { getRepositories } from '@/shared/repositories/repository-factory'
import { useAsyncState } from '@vueuse/core'

export const useCategoriesStore = defineStore('categories', () => {
  const repository = getRepositories().categories
  const {
    state: items,
    isLoading,
    isReady,
  } = useAsyncState<Category[]>(() => repository.getAll(), [])

  const findById = (id: string) => items.value.find((item) => item.id === id)

  const addCategory = async (payload: Omit<Category, 'id'> & Partial<Pick<Category, 'id'>>) => {
    const created = await repository.create(payload)
    items.value = [...items.value, created]
    return created
  }

  const updateCategory = async (id: string, payload: Partial<Omit<Category, 'id'>>) => {
    const updated = await repository.update(id, payload)
    items.value = items.value.map((item) => (item.id === id ? updated : item))
  }

  const removeCategory = async (id: string) => {
    const ok = await repository.remove(id)
    if (!ok) {
      return false
    }

    items.value = items.value.filter((item) => item.id !== id)
    return true
  }

  return {
    items,
    isLoading,
    isReady,
    findById,
    addCategory,
    updateCategory,
    removeCategory,
  }
})
