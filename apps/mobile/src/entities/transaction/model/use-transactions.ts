import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import {
  type CreateTransactionPayload,
  type Transaction,
  type TransactionQuery,
  type UpdateTransactionPayload,
  generateId,
} from '@expense-tracker/api'
import { useTransactionRepository } from '../api/repository-context'

/**
 * Centralized query-key factory. List queries (all / filtered / recent) share
 * the `['transactions']` prefix so a single invalidation refreshes every view.
 */
export const transactionKeys = {
  all: ['transactions'] as const,
  list: (query?: TransactionQuery) => ['transactions', 'list', query ?? {}] as const,
  recent: (limit: number) => ['transactions', 'recent', limit] as const,
}

/** Snapshot of cached lists captured before an optimistic mutation, for rollback. */
type MutationContext = {
  previous: [QueryKey, Transaction[] | undefined][]
}

function rollback(
  queryClient: ReturnType<typeof useQueryClient>,
  context: MutationContext | undefined,
): void {
  if (!context) return
  for (const [key, data] of context.previous) {
    queryClient.setQueryData(key, data)
  }
}

/** Full transaction history, newest first. */
export function useTransactions(query: TransactionQuery = {}) {
  const repo = useTransactionRepository()
  return useQuery({
    queryKey: transactionKeys.list(query),
    queryFn: () => repo.query(query),
  })
}

/** The N most recent transactions (Home recent list). */
export function useRecentTransactions(limit = 5) {
  const repo = useTransactionRepository()
  return useQuery({
    queryKey: transactionKeys.recent(limit),
    queryFn: () => repo.query({ limit }),
  })
}

/**
 * Create a transaction with an optimistic update. The id is generated client-side
 * so the provisional record can be inserted into every cached list immediately;
 * on failure the lists roll back, then the server truth is refetched.
 */
export function useCreateTransaction() {
  const repo = useTransactionRepository()
  const queryClient = useQueryClient()

  return useMutation<Transaction, Error, CreateTransactionPayload, MutationContext>({
    mutationFn: (payload) => repo.create(payload),
    async onMutate(payload) {
      const provisional: Transaction = {
        ...(payload as Transaction),
        id: payload.id ?? generateId(),
        version: 1,
      }
      await queryClient.cancelQueries({ queryKey: transactionKeys.all })

      const previous = queryClient.getQueriesData<Transaction[]>({
        queryKey: transactionKeys.all,
      })
      queryClient.setQueriesData<Transaction[]>({ queryKey: transactionKeys.all }, (old) =>
        old ? [provisional, ...old] : [provisional],
      )
      return { previous }
    },
    onError: (_error, _payload, context) => {
      rollback(queryClient, context)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}

export function useUpdateTransaction() {
  const repo = useTransactionRepository()
  const queryClient = useQueryClient()

  return useMutation<Transaction, Error, { id: string; payload: UpdateTransactionPayload }>({
    mutationFn: ({ id, payload }) => repo.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}

export function useDeleteTransaction() {
  const repo = useTransactionRepository()
  const queryClient = useQueryClient()

  return useMutation<void, Error, string, MutationContext>({
    mutationFn: (id) => repo.remove(id),
    async onMutate(id) {
      await queryClient.cancelQueries({ queryKey: transactionKeys.all })
      const previous = queryClient.getQueriesData<Transaction[]>({
        queryKey: transactionKeys.all,
      })
      queryClient.setQueriesData<Transaction[]>({ queryKey: transactionKeys.all }, (old) =>
        old ? old.filter((t) => t.id !== id) : old,
      )
      return { previous }
    },
    onError: (_error, _id, context) => {
      rollback(queryClient, context)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}
