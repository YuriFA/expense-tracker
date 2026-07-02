import type { Transaction } from './types'
import {
  useTransactionRepository,
  type CreateTransactionPayload,
  type TransactionQuery,
  type UpdateTransactionPayload,
} from './repository'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'

type GetTransactionsOptions = TransactionQuery

export const useTransactions = (options: MaybeRefOrGetter<GetTransactionsOptions> = {}) => {
  const transactions = useTransactionRepository()
  return useQuery({
    key: () => ['transactions', toValue(options)],
    query: () => {
      return transactions.query(toValue(options))
    },
  })
}

export const useTransaction = (id: MaybeRefOrGetter<string | undefined>) => {
  const transactions = useTransactionRepository()
  return useQuery({
    key: () => ['transactions', toValue(id) ?? null],
    query: () => {
      return transactions.getById(toValue(id)!)
    },
    enabled: () => !!toValue(id),
  })
}

export const useCreateTransaction = <T extends Transaction>() => {
  const queryCache = useQueryCache()
  const transactions = useTransactionRepository()
  return useMutation({
    mutation: (payload: CreateTransactionPayload<T>) => {
      return transactions.create(payload)
    },
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['transactions'] })
      queryCache.invalidateQueries({ key: ['accounts'] })
    },
  })
}

export const useUpdateTransaction = () => {
  const queryCache = useQueryCache()
  const transactions = useTransactionRepository()
  return useMutation({
    mutation: ({ id, payload }: { id: string; payload: UpdateTransactionPayload }) => {
      return transactions.update(id, payload)
    },
    onSettled: (_data, _errors, { id }) => {
      queryCache.invalidateQueries({ key: ['transactions', id] })
      queryCache.invalidateQueries({ key: ['accounts'] })
    },
  })
}

export const useDeleteTransaction = () => {
  const queryCache = useQueryCache()
  const transactions = useTransactionRepository()
  return useMutation({
    mutation: (id: string) => {
      return transactions.remove(id)
    },
    onSettled: (_data, _errors, id) => {
      queryCache.invalidateQueries({ key: ['transactions', id] })
      queryCache.invalidateQueries({ key: ['transactions'] })
      queryCache.invalidateQueries({ key: ['accounts'] })
    },
  })
}
