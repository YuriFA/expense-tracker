import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { useQueryCache } from '@pinia/colada'
import type { Category } from './types'
import {
  useCategoriesIncludingArchived,
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useSetCategoryArchived,
  useDeleteCategory,
} from './use-categories'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const categoryFixture: Category = {
  version: 1,
  id: 'c1',
  name: 'Food',
  type: 'expense',
  icon: '🍔',
  color: '#FF0000',
  archivedAt: null,
  slug: 'food',
}

function mountWithComposable<T>(
  composable: () => T,
  options: Parameters<typeof mountWithProviders>[1] = {},
): { wrapper: ReturnType<typeof mountWithProviders>; result: T } {
  let result!: T
  const TestComponent = defineComponent({
    setup() {
      result = composable()
      return () => h('div')
    },
  })
  const wrapper = mountWithProviders(TestComponent, options)
  return { wrapper, result }
}

describe('useCategoriesIncludingArchived', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls repository.getAllIncludingArchived on mount', async () => {
    const repo = createMockCategoryRepository()
    repo.getAllIncludingArchived.mockResolvedValue([categoryFixture])
    const { result } = mountWithComposable(() => useCategoriesIncludingArchived(), {
      repositories: { categories: repo },
    })
    await flushPromises()
    await flushPromises()
    expect(repo.getAllIncludingArchived).toHaveBeenCalled()
    expect(result.data.value).toEqual([categoryFixture])
  })
})

describe('useCategory', () => {
  it('disables query when id is undefined', () => {
    const repo = createMockCategoryRepository()
    const { result } = mountWithComposable(() => useCategory(() => undefined), {
      repositories: { categories: repo },
    })
    expect(repo.getById).not.toHaveBeenCalled()
    expect(result.isLoading.value).toBe(false)
  })

  it('fetches when id is provided', async () => {
    const repo = createMockCategoryRepository()
    repo.getById.mockResolvedValue(categoryFixture)
    mountWithComposable(() => useCategory(() => 'c1'), {
      repositories: { categories: repo },
    })
    await flushPromises()
    await flushPromises()
    expect(repo.getById).toHaveBeenCalledWith('c1')
  })
})

describe('useCreateCategory', () => {
  it('calls repository.create on mutate', async () => {
    const repo = createMockCategoryRepository()
    repo.create.mockResolvedValue(categoryFixture)
    const { result } = mountWithComposable(() => useCreateCategory(), {
      repositories: { categories: repo },
    })
    await result.mutateAsync({
      name: 'Food',
      type: 'expense',
      icon: '🍔',
      color: '#FF0000',
      slug: 'food',
    })
    expect(repo.create).toHaveBeenCalledWith({
      name: 'Food',
      type: 'expense',
      icon: '🍔',
      color: '#FF0000',
      slug: 'food',
    })
  })
})

describe('useUpdateCategory', () => {
  it('calls repository.update on mutate', async () => {
    const repo = createMockCategoryRepository()
    repo.update.mockResolvedValue(categoryFixture)
    const { result } = mountWithComposable(() => useUpdateCategory(), {
      repositories: { categories: repo },
    })
    await result.mutateAsync({ id: 'c1', payload: { name: 'Updated', version: 1 } })
    expect(repo.update).toHaveBeenCalledWith('c1', { name: 'Updated', version: 1 })
  })

  it('translates the archived flag into an archivedAt patch', async () => {
    const repo = createMockCategoryRepository()
    repo.update.mockResolvedValue({ ...categoryFixture, archivedAt: '2026-09-01T00:00:00Z' })
    const { result } = mountWithComposable(
      () => {
        const queryCache = useQueryCache()
        queryCache.setQueryData<Category[]>(['categories', 'including-archived'], [categoryFixture])
        return { mutation: useUpdateCategory(), queryCache }
      },
      { repositories: { categories: repo } },
    )

    await result.mutation.mutateAsync({ id: 'c1', payload: { version: 1, archived: true } })
    await flushPromises()

    const patched = result.queryCache.getQueryData<Category[]>([
      'categories',
      'including-archived',
    ])?.[0]
    expect(patched?.archivedAt).not.toBeNull()
    expect(patched).not.toHaveProperty('archived')
  })

  it('optimistically patches category in list and detail caches', async () => {
    const repo = createMockCategoryRepository()
    repo.update.mockResolvedValue({ ...categoryFixture, name: 'Updated' })
    const { result } = mountWithComposable(
      () => {
        const queryCache = useQueryCache()
        queryCache.setQueryData<Category[]>(['categories'], [categoryFixture])
        queryCache.setQueryData<Category>(['categories', 'c1'], categoryFixture)
        return { mutation: useUpdateCategory(), queryCache }
      },
      { repositories: { categories: repo } },
    )

    await result.mutation.mutateAsync({ id: 'c1', payload: { name: 'Updated', version: 1 } })
    await flushPromises()

    expect(result.queryCache.getQueryData<Category[]>(['categories'])?.[0]?.name).toBe('Updated')
    expect(result.queryCache.getQueryData<Category>(['categories', 'c1'])?.name).toBe('Updated')
  })

  it('rolls back list cache on error', async () => {
    const repo = createMockCategoryRepository()
    repo.update.mockRejectedValue(new Error('boom'))
    const { result } = mountWithComposable(
      () => {
        const queryCache = useQueryCache()
        queryCache.setQueryData<Category[]>(['categories'], [categoryFixture])
        return { mutation: useUpdateCategory(), queryCache }
      },
      { repositories: { categories: repo } },
    )

    await expect(
      result.mutation.mutateAsync({ id: 'c1', payload: { name: 'Updated', version: 1 } }),
    ).rejects.toThrow('boom')
    await flushPromises()

    expect(result.queryCache.getQueryData<Category[]>(['categories'])?.[0]?.name).toBe('Food')
  })
})

describe('useSetCategoryArchived', () => {
  it('calls repository.update with the archived flag', async () => {
    const repo = createMockCategoryRepository()
    repo.update.mockResolvedValue(categoryFixture)
    const { result } = mountWithComposable(() => useSetCategoryArchived(), {
      repositories: { categories: repo },
    })
    await result.mutateAsync({ id: 'c1', version: 3, archived: true })
    expect(repo.update).toHaveBeenCalledWith('c1', { version: 3, archived: true })
  })
})

describe('useDeleteCategory', () => {
  it('calls repository.remove on mutate', async () => {
    const repo = createMockCategoryRepository()
    repo.remove.mockResolvedValue(undefined)
    const { result } = mountWithComposable(() => useDeleteCategory(), {
      repositories: { categories: repo },
    })
    await result.mutateAsync({ id: 'c1' })
    expect(repo.remove).toHaveBeenCalledWith('c1', undefined)
  })

  it('passes the cascade flag to repository.remove', async () => {
    const repo = createMockCategoryRepository()
    repo.remove.mockResolvedValue(undefined)
    const { result } = mountWithComposable(() => useDeleteCategory(), {
      repositories: { categories: repo },
    })
    await result.mutateAsync({ id: 'c1', cascade: true })
    expect(repo.remove).toHaveBeenCalledWith('c1', { cascade: true })
  })

  it('optimistically removes category from list and detail caches', async () => {
    const repo = createMockCategoryRepository()
    repo.remove.mockResolvedValue(undefined)
    const otherCategory: Category = { ...categoryFixture, id: 'c2' }
    const { result } = mountWithComposable(
      () => {
        const queryCache = useQueryCache()
        queryCache.setQueryData<Category[]>(['categories'], [categoryFixture, otherCategory])
        queryCache.setQueryData<Category>(['categories', 'c1'], categoryFixture)
        return { mutation: useDeleteCategory(), queryCache }
      },
      { repositories: { categories: repo } },
    )

    await result.mutation.mutateAsync({ id: 'c1' })
    await flushPromises()

    expect(result.queryCache.getQueryData<Category[]>(['categories'])?.map((c) => c.id)).toEqual([
      'c2',
    ])
    expect(result.queryCache.getQueryData(['categories', 'c1'])).toBeUndefined()
  })

  it('rolls back list cache on error', async () => {
    const repo = createMockCategoryRepository()
    repo.remove.mockRejectedValue(new Error('boom'))
    const { result } = mountWithComposable(
      () => {
        const queryCache = useQueryCache()
        queryCache.setQueryData<Category[]>(['categories'], [categoryFixture])
        return { mutation: useDeleteCategory(), queryCache }
      },
      { repositories: { categories: repo } },
    )

    await expect(result.mutation.mutateAsync({ id: 'c1' })).rejects.toThrow('boom')
    await flushPromises()

    expect(result.queryCache.getQueryData<Category[]>(['categories'])?.map((c) => c.id)).toEqual([
      'c1',
    ])
  })
})
