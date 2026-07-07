import {
  useAccountRepository,
  type CreateAccountPayload,
  type UpdateAccountPayload,
} from '../api/repository'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { useOptimisticMutation, type OptimisticPatch } from '@/shared/lib/use-optimistic-mutation'
import type { AccountWithBalance } from './types'

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
  const accounts = useAccountRepository()
  return useOptimisticMutation<{ id: string; payload: UpdateAccountPayload }, AccountWithBalance>({
    mutation: ({ id, payload }) => accounts.update(id, payload),
    optimistic: ({ id, payload }) => {
      // manualAdjustment меняет баланс — не делаем optimistic update, чтобы не было рассинхрона с сервером
      if ('manualAdjustment' in payload) return []
      const patches: OptimisticPatch[] = [
        {
          key: ['accounts'],
          updater: (current) =>
            (current as AccountWithBalance[] | undefined)?.map((account) =>
              account.id === id ? { ...account, ...payload } : account,
            ),
        },
        {
          key: ['accounts', id],
          updater: (current) =>
            current === undefined ? undefined : { ...(current as AccountWithBalance), ...payload },
        },
      ]
      return patches
    },
    invalidateKeys: () => [['accounts']],
  })
}

export const useDeleteAccount = () => {
  const accounts = useAccountRepository()
  return useOptimisticMutation<string, void>({
    mutation: (id) => accounts.remove(id),
    optimistic: (id) => [
      {
        key: ['accounts'],
        updater: (current) =>
          (current as AccountWithBalance[] | undefined)?.filter((account) => account.id !== id),
      },
      {
        key: ['accounts', id],
        updater: () => undefined,
      },
    ],
  })
}
