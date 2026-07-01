import type { Transaction } from '@/entities/transaction/types'
import { getRepositories } from '@/shared/repositories/repository-factory'
import type {
  CreateTransactionPayload,
  TransactionQuery,
  UpdateTransactionPayload,
} from '@/shared/repositories/transaction-repository'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'

type GetTransactionsOptions = TransactionQuery

export const useTransactions = (options: MaybeRefOrGetter<GetTransactionsOptions> = {}) => {
  return useQuery({
    key: () => ['transactions', toValue(options)],
    query: () => {
      return getRepositories().transactions.query(toValue(options))
    },
  })
}

export const useTransaction = (id: MaybeRefOrGetter<string | undefined>) => {
  return useQuery({
    key: () => ['transactions', toValue(id) ?? null],
    query: () => {
      return getRepositories().transactions.getById(toValue(id)!)
    },
    enabled: () => !!toValue(id),
  })
}

export const useCreateTransaction = <T extends Transaction>() => {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (payload: CreateTransactionPayload<T>) => {
      return getRepositories().transactions.create(payload)
    },
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['transactions'] })
      queryCache.invalidateQueries({ key: ['accounts'] })
    },
  })
}

export const useUpdateTransaction = () => {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: ({ id, payload }: { id: string; payload: UpdateTransactionPayload }) => {
      return getRepositories().transactions.update(id, payload)
    },
    onSettled: (_data, _errors, { id }) => {
      queryCache.invalidateQueries({ key: ['transactions', id] })
      queryCache.invalidateQueries({ key: ['accounts'] })
    },
  })
}

export const useDeleteTransaction = () => {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (id: string) => {
      return getRepositories().transactions.remove(id)
    },
    onSettled: (_data, _errors, id) => {
      queryCache.invalidateQueries({ key: ['transactions', id] })
      queryCache.invalidateQueries({ key: ['transactions'] })
      queryCache.invalidateQueries({ key: ['accounts'] })
    },
  })
}
