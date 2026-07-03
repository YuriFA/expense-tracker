import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { Category } from './types'
import {
  useCategories,
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from './use-categories'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const categoryFixture: Category = {
  id: 'c1',
  name: 'Food',
  type: 'expense',
  icon: '🍔',
  color: '#FF0000',
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

describe('useCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls repository.getAll on mount', async () => {
    const repo = createMockCategoryRepository()
    repo.getAll.mockResolvedValue([categoryFixture])
    const { result } = mountWithComposable(() => useCategories(), {
      repositories: { categories: repo },
    })
    await flushPromises()
    await flushPromises()
    expect(repo.getAll).toHaveBeenCalled()
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
    })
    expect(repo.create).toHaveBeenCalledWith({
      name: 'Food',
      type: 'expense',
      icon: '🍔',
      color: '#FF0000',
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
    await result.mutateAsync({ id: 'c1', payload: { name: 'Updated' } })
    expect(repo.update).toHaveBeenCalledWith('c1', { name: 'Updated' })
  })
})

describe('useDeleteCategory', () => {
  it('calls repository.remove on mutate', async () => {
    const repo = createMockCategoryRepository()
    repo.remove.mockResolvedValue(undefined)
    const { result } = mountWithComposable(() => useDeleteCategory(), {
      repositories: { categories: repo },
    })
    await result.mutateAsync('c1')
    expect(repo.remove).toHaveBeenCalledWith('c1')
  })
})
