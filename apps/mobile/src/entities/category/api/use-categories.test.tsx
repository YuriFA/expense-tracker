// Hook tests: queries read through the injected repository and mutations
// write through and invalidate the ['categories'] cache.

import { describe, expect, it } from '@jest/globals'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { createQueryClient } from '@/shared/lib/query/query-client'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { CategoryRepositoryProvider } from '../api/repository'
import { createMockCategoryRepository } from '@/shared/lib/testing/mock-category-repository'
import {
  useCategories,
  useCategoriesIncludingArchived,
  useCreateCategory,
} from '../model/use-categories'

function createWrapper(
  repository: ReturnType<typeof createMockCategoryRepository>,
  queryClient: QueryClient,
) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <CategoryRepositoryProvider repository={repository}>{children}</CategoryRepositoryProvider>
    </QueryClientProvider>
  )
}

describe('category hooks', () => {
  it('useCategories hides archived categories; the including-archived query keeps them', async () => {
    const repository = createMockCategoryRepository([
      {
        id: 'cat-active',
        name: 'Такси',
        type: 'expense',
        icon: 'car',
        color: '#7c5cff',
        archivedAt: null,
        version: 1,
      },
      {
        id: 'cat-archived',
        name: 'Старое',
        type: 'expense',
        icon: 'box',
        color: '#a78bfa',
        archivedAt: '2026-09-01T00:00:00.000Z',
        version: 2,
      },
    ])
    const queryClient = createQueryClient()

    const active = renderHook(() => useCategories(), {
      wrapper: createWrapper(repository, queryClient),
    })
    await waitFor(() => expect(active.result.current.data).toHaveLength(1))
    expect(active.result.current.data?.[0].id).toBe('cat-active')

    const all = renderHook(() => useCategoriesIncludingArchived(), {
      wrapper: createWrapper(repository, queryClient),
    })
    await waitFor(() => expect(all.result.current.data).toHaveLength(2))
  })

  it('useCategories reads through the repository and filters by type', async () => {
    const repository = createMockCategoryRepository([
      {
        id: 'cat-1',
        name: 'Такси',
        type: 'expense',
        icon: 'car',
        color: '#7c5cff',
        archivedAt: null,
        version: 1,
      },
      {
        id: 'cat-2',
        name: 'Зарплата',
        type: 'income',
        icon: 'cash',
        color: '#16a34a',
        archivedAt: null,
        version: 1,
      },
    ])
    const queryClient = createQueryClient()

    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(repository, queryClient),
    })

    await waitFor(() => expect(result.current.data).toHaveLength(2))
    expect(repository.calls.getAll).toBe(1)

    const expenses = renderHook(() => useCategories('expense'), {
      wrapper: createWrapper(repository, queryClient),
    })
    await waitFor(() => expect(expenses.result.current.data).toHaveLength(1))
    expect(expenses.result.current.data?.[0].name).toBe('Такси')
    // Same ['categories'] query - no extra repository read.
    expect(repository.calls.getAll).toBe(1)
  })

  it('useCreateCategory writes through and invalidates the list', async () => {
    const repository = createMockCategoryRepository()
    const queryClient = createQueryClient()
    const wrapper = createWrapper(repository, queryClient)

    const list = renderHook(() => useCategories(), { wrapper })
    await waitFor(() => expect(list.result.current.data).toHaveLength(0))

    const create = renderHook(() => useCreateCategory(), { wrapper })
    await act(async () => {
      await create.result.current.mutateAsync({
        name: 'Такси',
        type: 'expense',
        icon: 'car',
        color: '#7c5cff',
      })
    })

    expect(repository.calls.create).toBe(1)
    expect(repository.snapshot()).toHaveLength(1)
    // Invalidated: the list query re-read the repository.
    await waitFor(() => expect(list.result.current.data).toHaveLength(1))
    expect(repository.calls.getAll).toBe(2)
  })
})
