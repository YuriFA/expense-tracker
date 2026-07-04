import {
  useAccountRepository,
  type CreateAccountPayload,
  type UpdateAccountPayload,
} from '../api/repository'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'

export const useAccounts = () => {
  const accounts = useAccountRepository()
  return useQuery({
    key: () => ['accounts'],
    query: () => accounts.getAll(),
  })
}

export const useAccount = (id: MaybeRefOrGetter<string | undefined>) => {
  const accounts = useAccountRepository()
  return useQuery({
    key: () => ['accounts', toValue(id) ?? null],
    query: () => accounts.getById(toValue(id)!),
    enabled: () => !!toValue(id),
  })
}

export const useCreateAccount = () => {
  const queryCache = useQueryCache()
  const accounts = useAccountRepository()
  return useMutation({
    mutation: (payload: CreateAccountPayload) => accounts.create(payload),
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['accounts'] })
    },
  })
}

export const useUpdateAccount = () => {
  const queryCache = useQueryCache()
  const accounts = useAccountRepository()
  return useMutation({
    mutation: ({ id, payload }: { id: string; payload: UpdateAccountPayload }) => {
      return accounts.update(id, payload)
    },
    onSettled: (_data, _errors, { id }) => {
      queryCache.invalidateQueries({ key: ['accounts', id] })
      queryCache.invalidateQueries({ key: ['accounts'] })
    },
  })
}

export const useDeleteAccount = () => {
  const queryCache = useQueryCache()
  const accounts = useAccountRepository()
  return useMutation({
    mutation: (id: string) => accounts.remove(id),
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['accounts'] })
    },
  })
}
