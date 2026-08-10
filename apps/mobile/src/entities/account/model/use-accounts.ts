import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import type {
  AccountWithBalance,
  CreateAccountPayload,
  UpdateAccountPayload,
} from '@expense-tracker/api'
import { useAccountRepository } from '../api/repository-context'

/** Centralized query-key factory so invalidation is exhaustive. */
export const accountKeys = {
  all: ['accounts'] as const,
  detail: (id: string) => ['accounts', id] as const,
}

/** All accounts with computed balances. */
export function useAccounts() {
  const repo = useAccountRepository()
  return useQuery({
    queryKey: accountKeys.all,
    queryFn: () => repo.getAll(),
  })
}

/** A single account with its computed balance. */
export function useAccount(id: string | undefined) {
  const repo = useAccountRepository()
  return useQuery({
    queryKey: accountKeys.detail(id ?? ''),
    queryFn: () => (id ? repo.getById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  })
}

export function useCreateAccount() {
  const repo = useAccountRepository()
  const queryClient = useQueryClient()
  return useMutation<AccountWithBalance, Error, CreateAccountPayload>({
    mutationFn: (payload) => repo.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all })
    },
  })
}

export function useUpdateAccount() {
  const repo = useAccountRepository()
  const queryClient = useQueryClient()
  return useMutation<AccountWithBalance, Error, { id: string; payload: UpdateAccountPayload }>({
    mutationFn: ({ id, payload }) => repo.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all })
    },
  })
}

export function useDeleteAccount() {
  const repo = useAccountRepository()
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => repo.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all })
    },
  })
}
