import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateDebtOperationPayload,
  CreateDebtorPayload,
  UpdateDebtOperationPayload,
  UpdateDebtorPayload,
} from '@expense-tracker/api'
import { useDebtOperationRepository, useDebtorRepository } from '../api/repository'

export function useDebtors() {
  const repository = useDebtorRepository()
  return useQuery({
    queryKey: ['debtors'],
    queryFn: () => repository.getAll(),
  })
}

/**
 * Loads ALL live debt operations in one query: balances are derived sums, so
 * every screen figure comes from in-memory selectors over this single read
 * (design D7 performance invariant - no per-debtor repository calls).
 */
export function useDebtOperations() {
  const repository = useDebtOperationRepository()
  return useQuery({
    queryKey: ['debt-operations'],
    queryFn: () => repository.getAll(),
  })
}

export function useCreateDebtor() {
  const repository = useDebtorRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDebtorPayload) => repository.create(payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['debtors'] }),
  })
}

export function useUpdateDebtor() {
  const repository = useDebtorRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDebtorPayload }) =>
      repository.update(id, payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['debtors'] }),
  })
}

export function useDeleteDebtor() {
  const repository = useDebtorRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repository.remove(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['debtors'] }),
  })
}

export function useCreateDebtOperation() {
  const repository = useDebtOperationRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDebtOperationPayload) => repository.create(payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['debt-operations'] }),
  })
}

export function useUpdateDebtOperation() {
  const repository = useDebtOperationRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDebtOperationPayload }) =>
      repository.update(id, payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['debt-operations'] }),
  })
}

export function useDeleteDebtOperation() {
  const repository = useDebtOperationRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repository.remove(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['debt-operations'] }),
  })
}
