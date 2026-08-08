import {
  useCategoryRepository,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from '../api/repository'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { useOptimisticMutation } from '@/shared/lib/use-optimistic-mutation'
import type { Category } from './types'
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
  const categories = useCategoryRepository()
  return useOptimisticMutation<{ id: string; payload: UpdateCategoryPayload }, Category>({
    mutation: ({ id, payload }) => categories.update(id, payload),
    optimistic: ({ id, payload }) => [
      {
        key: ['categories'],
        updater: (current) =>
          (current as Category[] | undefined)?.map((category) =>
            category.id === id ? { ...category, ...payload } : category,
          ),
      },
      {
        key: ['categories', id],
        updater: (current) =>
          current === undefined ? undefined : { ...(current as Category), ...payload },
      },
    ],
  })
}

export const useDeleteCategory = () => {
  const categories = useCategoryRepository()
  return useOptimisticMutation<string, void>({
    mutation: (id) => categories.remove(id),
    optimistic: (id) => [
      {
        key: ['categories'],
        updater: (current) =>
          (current as Category[] | undefined)?.filter((category) => category.id !== id),
      },
      {
        key: ['categories', id],
        updater: () => undefined,
      },
    ],
  })
}
