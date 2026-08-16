// Hook tests: transaction queries keyed by options; create/delete
// invalidate BOTH ['transactions'] and ['accounts'] (balances change).

import { describe, expect, it } from '@jest/globals'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { createQueryClient } from '@/shared/lib/query/query-client'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { TransactionRepositoryProvider } from '../api/repository'
import { createMockTransactionRepository } from '../model/mock-repository'
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
} from '../model/use-transactions'

function createWrapper(
  repository: ReturnType<typeof createMockTransactionRepository>,
  queryClient: QueryClient,
) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TransactionRepositoryProvider repository={repository}>
        {children}
      </TransactionRepositoryProvider>
    </QueryClientProvider>
  )
}

const EXPENSE = {
  type: 'expense' as const,
  amount: 1_000,
  description: 'Кофе',
  occurredAt: '2026-08-10T12:00:00.000Z',
  accountId: 'acc-1',
  categoryId: 'cat-1',
}

describe('transaction hooks', () => {
  it('useTransactions queries with the options in the key', async () => {
    const repository = createMockTransactionRepository([{ ...EXPENSE, id: 'tx-1', version: 1 }])
    const queryClient = createQueryClient()

    const all = renderHook(() => useTransactions(), {
      wrapper: createWrapper(repository, queryClient),
    })
    await waitFor(() => expect(all.result.current.data).toHaveLength(1))

    const expensesOnly = renderHook(() => useTransactions({ type: 'expense' }), {
      wrapper: createWrapper(repository, queryClient),
    })
    await waitFor(() => expect(expensesOnly.result.current.data).toHaveLength(1))
    expect(repository.calls.query).toBe(2)
  })

  it('useCreateTransaction writes through and invalidates the transactions cache', async () => {
    const repository = createMockTransactionRepository()
    const queryClient = createQueryClient()
    const wrapper = createWrapper(repository, queryClient)

    const list = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(list.result.current.data).toHaveLength(0))

    const create = renderHook(() => useCreateTransaction(), { wrapper })
    await act(async () => {
      await create.result.current.mutateAsync(EXPENSE)
    })

    expect(repository.snapshot()).toHaveLength(1)
    await waitFor(() => expect(list.result.current.data).toHaveLength(1))
    expect(repository.calls.query).toBe(2)
  })

  it('useDeleteTransaction invalidates the transactions cache', async () => {
    const repository = createMockTransactionRepository([{ ...EXPENSE, id: 'tx-1', version: 1 }])
    const queryClient = createQueryClient()
    const wrapper = createWrapper(repository, queryClient)

    const list = renderHook(() => useTransactions(), { wrapper })
    await waitFor(() => expect(list.result.current.data).toHaveLength(1))

    const remove = renderHook(() => useDeleteTransaction(), { wrapper })
    await act(async () => {
      await remove.result.current.mutateAsync('tx-1')
    })

    await waitFor(() => expect(list.result.current.data).toHaveLength(0))
    expect(repository.calls.remove).toBe(1)
  })
})
