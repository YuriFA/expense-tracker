import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

import type { Category } from '@/entities/category/types'
import { getRepositories } from '@/shared/repositories/repository-factory'

export const useCategoriesStore = defineStore('categories', () => {
  const repository = getRepositories().categories
  const items = shallowRef<Category[]>([])

  const ready = repository.getAll().then((category) => {
    items.value = category
  })

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
    ready,
    findById,
    addCategory,
    updateCategory,
    removeCategory,
  }
})
