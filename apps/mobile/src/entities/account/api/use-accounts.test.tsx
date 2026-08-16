// Hook tests: account queries and mutations with ['accounts'] invalidation.

import { describe, expect, it } from '@jest/globals'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { createQueryClient } from '@/shared/lib/query/query-client'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { AccountRepositoryProvider } from '../api/repository'
import { createMockAccountRepository } from '../model/mock-repository'
import { useAccount, useAccounts, useCreateAccount, useDeleteAccount } from '../model/use-accounts'

function createWrapper(
  repository: ReturnType<typeof createMockAccountRepository>,
  queryClient: QueryClient,
) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AccountRepositoryProvider repository={repository}>{children}</AccountRepositoryProvider>
    </QueryClientProvider>
  )
}

describe('account hooks', () => {
  it('useAccounts and useAccount read through the repository', async () => {
    const repository = createMockAccountRepository([
      {
        id: 'acc-1',
        name: 'Карта',
        currency: 'RUB',
        openingBalance: 1_000,
        manualAdjustment: 0,
        version: 1,
      },
    ])
    const queryClient = createQueryClient()
    const wrapper = createWrapper(repository, queryClient)

    const list = renderHook(() => useAccounts(), { wrapper })
    await waitFor(() => expect(list.result.current.data?.[0].balance).toBe(1_000))

    const one = renderHook(() => useAccount('acc-1'), { wrapper })
    await waitFor(() => expect(one.result.current.data?.name).toBe('Карта'))
  })

  it('useCreateAccount writes through and invalidates the list', async () => {
    const repository = createMockAccountRepository()
    const queryClient = createQueryClient()
    const wrapper = createWrapper(repository, queryClient)

    const list = renderHook(() => useAccounts(), { wrapper })
    await waitFor(() => expect(list.result.current.data).toHaveLength(0))

    const create = renderHook(() => useCreateAccount(), { wrapper })
    await act(async () => {
      await create.result.current.mutateAsync({
        name: 'Карта',
        currency: 'RUB',
        openingBalance: 500,
      })
    })

    expect(repository.snapshot()).toHaveLength(1)
    await waitFor(() => expect(list.result.current.data).toHaveLength(1))
    expect(repository.calls.getAll).toBe(2)
  })

  it('useDeleteAccount invalidates the list', async () => {
    const repository = createMockAccountRepository([
      {
        id: 'acc-1',
        name: 'Карта',
        currency: 'RUB',
        openingBalance: 0,
        manualAdjustment: 0,
        version: 1,
      },
    ])
    const queryClient = createQueryClient()
    const wrapper = createWrapper(repository, queryClient)

    const list = renderHook(() => useAccounts(), { wrapper })
    await waitFor(() => expect(list.result.current.data).toHaveLength(1))

    const remove = renderHook(() => useDeleteAccount(), { wrapper })
    await act(async () => {
      await remove.result.current.mutateAsync('acc-1')
    })

    await waitFor(() => expect(list.result.current.data).toHaveLength(0))
    expect(repository.calls.remove).toBe(1)
  })
})
