import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreatePlannedPaymentPayload, UpdatePlannedPaymentPayload } from '@expense-tracker/api'
import { usePlannedPaymentRepository } from '../api/repository'
import type { ConfirmPlannedPaymentInput } from '../api/local-repository'

/**
 * Loads ALL live plans in ONE query: card figures, per-type lists, and
 * reminders derive in-memory (type split happens in selectors — no per-type
 * queries, design D6/D7 performance invariant).
 */
export function usePlannedPayments() {
  const repository = usePlannedPaymentRepository()
  return useQuery({
    queryKey: ['planned-payments'],
    queryFn: () => repository.getAll(),
  })
}

export function useCreatePlannedPayment() {
  const repository = usePlannedPaymentRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePlannedPaymentPayload) => repository.create(payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['planned-payments'] }),
  })
}

export function useUpdatePlannedPayment() {
  const repository = usePlannedPaymentRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePlannedPaymentPayload }) =>
      repository.update(id, payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['planned-payments'] }),
  })
}

export function useDeletePlannedPayment() {
  const repository = usePlannedPaymentRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repository.remove(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['planned-payments'] }),
  })
}

/** Manual confirmation: invalidates both the plan and the transaction caches. */
export function useConfirmPlannedPayment() {
  const repository = usePlannedPaymentRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ConfirmPlannedPaymentInput) => repository.confirmPlannedPayment(input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['planned-payments'] })
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
