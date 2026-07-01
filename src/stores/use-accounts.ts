import type {
  CreateAccountPayload,
  UpdateAccountPayload,
} from '@/shared/repositories/account-repository'
import { getRepositories } from '@/shared/repositories/repository-factory'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'

export const useAccounts = () => {
  return useQuery({
    key: () => ['accounts'],
    query: () => getRepositories().accounts.getAll(),
  })
}

export const useAccount = (id: MaybeRefOrGetter<string | undefined>) => {
  return useQuery({
    key: () => ['accounts', toValue(id) ?? null],
    query: () => getRepositories().accounts.getById(toValue(id)!),
    enabled: () => !!toValue(id),
  })
}

export const useCreateAccount = () => {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (payload: CreateAccountPayload) => {
      return getRepositories().accounts.create(payload)
    },
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['accounts'] })
    },
  })
}

export const useUpdateAccount = () => {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: ({ id, payload }: { id: string; payload: UpdateAccountPayload }) => {
      return getRepositories().accounts.update(id, payload)
    },
    onSettled: (_data, _errors, { id }) => {
      queryCache.invalidateQueries({ key: ['accounts', id] })
      queryCache.invalidateQueries({ key: ['accounts'] })
    },
  })
}

export const useDeleteAccount = () => {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (id: string) => {
      return getRepositories().accounts.remove(id)
    },
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['accounts'] })
    },
  })
}
