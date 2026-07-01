import { getRepositories } from '@/shared/repositories/repository-factory'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type {
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '@/shared/repositories/category-repository'
import { toValue, type MaybeRefOrGetter } from 'vue'

export const useCategories = () => {
  return useQuery({
    key: () => ['categories'],
    query: () => getRepositories().categories.getAll(),
  })
}

export const useCategory = (id: MaybeRefOrGetter<string | undefined>) => {
  return useQuery({
    key: () => ['categories', toValue(id) ?? null],
    query: () => getRepositories().categories.getById(toValue(id)!),
    enabled: () => !!toValue(id),
  })
}

export const useCreateCategory = () => {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (payload: CreateCategoryPayload) => getRepositories().categories.create(payload),
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['categories'] })
    },
  })
}

export const useUpdateCategory = () => {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: ({ id, payload }: { id: string; payload: UpdateCategoryPayload }) => {
      return getRepositories().categories.update(id, payload)
    },
    onSettled: (_data, _errors, { id }) => {
      queryCache.invalidateQueries({ key: ['categories', id] })
      queryCache.invalidateQueries({ key: ['categories'] })
    },
  })
}

export const useDeleteCategory = () => {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (id: string) => getRepositories().categories.remove(id),
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['categories'] })
    },
  })
}
