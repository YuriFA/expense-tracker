import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '@expense-tracker/api'
import { useCategoryRepository } from '../api/repository-context'

/** Centralized query-key factory so invalidation is exhaustive. */
export const categoryKeys = {
  all: ['categories'] as const,
  detail: (id: string) => ['categories', id] as const,
}

/** All categories. */
export function useCategories() {
  const repo = useCategoryRepository()
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: () => repo.getAll(),
  })
}

export function useCreateCategory() {
  const repo = useCategoryRepository()
  const queryClient = useQueryClient()
  return useMutation<Category, Error, CreateCategoryPayload>({
    mutationFn: (payload) => repo.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useUpdateCategory() {
  const repo = useCategoryRepository()
  const queryClient = useQueryClient()
  return useMutation<Category, Error, { id: string; payload: UpdateCategoryPayload }>({
    mutationFn: ({ id, payload }) => repo.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useDeleteCategory() {
  const repo = useCategoryRepository()
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => repo.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}
