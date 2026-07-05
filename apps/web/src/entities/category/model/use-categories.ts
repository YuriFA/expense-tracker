import {
  useCategoryRepository,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from '../api/repository'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { mapCategories, mapCategory } from './map-categories'

export const useCategories = () => {
  const categories = useCategoryRepository()
  return useQuery({
    key: () => ['categories'],
    query: async () => {
      const items = await categories.getAll()
      return mapCategories(items)
    },
  })
}

export const useCategory = (id: MaybeRefOrGetter<string | undefined>) => {
  const categories = useCategoryRepository()
  return useQuery({
    key: () => ['categories', toValue(id) ?? null],
    query: async () => {
      const item = await categories.getById(toValue(id)!)
      return item ? mapCategory(item) : item
    },
    enabled: () => !!toValue(id),
  })
}

export const useCreateCategory = () => {
  const queryCache = useQueryCache()
  const categories = useCategoryRepository()
  return useMutation({
    mutation: (payload: CreateCategoryPayload) => categories.create(payload),
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['categories'] })
    },
  })
}

export const useUpdateCategory = () => {
  const queryCache = useQueryCache()
  const categories = useCategoryRepository()
  return useMutation({
    mutation: ({ id, payload }: { id: string; payload: UpdateCategoryPayload }) => {
      return categories.update(id, payload)
    },
    onSettled: (_data, _errors, { id }) => {
      queryCache.invalidateQueries({ key: ['categories', id] })
      queryCache.invalidateQueries({ key: ['categories'] })
    },
  })
}

export const useDeleteCategory = () => {
  const queryCache = useQueryCache()
  const categories = useCategoryRepository()
  return useMutation({
    mutation: (id: string) => categories.remove(id),
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['categories'] })
    },
  })
}
