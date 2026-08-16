import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  Category,
  CategoryType,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '@expense-tracker/api'
import { useCategoryRepository } from '../api/repository'

export function useCategories(type?: CategoryType) {
  const repository = useCategoryRepository()
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: () => repository.getAll(),
  })

  if (!type) return query
  return { ...query, data: query.data?.filter((category) => category.type === type) }
}

export function useCreateCategory() {
  const repository = useCategoryRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => repository.create(payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useUpdateCategory() {
  const repository = useCategoryRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCategoryPayload }) =>
      repository.update(id, payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useDeleteCategory() {
  const repository = useCategoryRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repository.remove(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export type { Category }
