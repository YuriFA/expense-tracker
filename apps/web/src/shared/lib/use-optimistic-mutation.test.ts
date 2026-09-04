import { describe, it, expect, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { useQueryCache, type EntryKey } from '@pinia/colada'
import { useOptimisticMutation, type OptimisticPatch } from './use-optimistic-mutation'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

interface Item {
  id: string
  name: string
}

const INITIAL_ITEMS: Item[] = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
]

interface SetupResult {
  mutation: ReturnType<typeof useOptimisticMutation<string, void>>
  queryCache: ReturnType<typeof useQueryCache>
}

function mountWithMutation(
  mutationFn: (id: string) => Promise<void>,
  optimistic: (id: string) => OptimisticPatch[] | OptimisticPatch,
  invalidateKeys?: (id: string) => EntryKey[],
): SetupResult {
  let result!: SetupResult
  const TestComponent = defineComponent({
    setup() {
      const queryCache = useQueryCache()
      queryCache.setQueryData<Item[]>(['items'], structuredClone(INITIAL_ITEMS))
      const mutation = useOptimisticMutation<string, void>({
        mutation: mutationFn,
        optimistic,
        invalidateKeys,
      })
      result = { mutation, queryCache }
      return () => h('div')
    },
  })
  mountWithProviders(TestComponent)
  return result
}

describe('useOptimisticMutation', () => {
  it('applies optimistic patch and keeps new state after success', async () => {
    const remove = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined)
    const { mutation, queryCache } = mountWithMutation(
      (id) => remove(id),
      (id) => ({
        key: ['items'],
        updater: (current) => (current as Item[] | undefined)?.filter((item) => item.id !== id),
      }),
    )

    await mutation.mutateAsync('a')
    await flushPromises()

    expect(remove).toHaveBeenCalledWith('a')
    expect(queryCache.getQueryData<Item[]>(['items'])?.map((i) => i.id)).toEqual(['b'])
  })

  it('rolls back to previous state on error', async () => {
    const remove = vi.fn<(id: string) => Promise<void>>().mockRejectedValue(new Error('boom'))
    const { mutation, queryCache } = mountWithMutation(
      (id) => remove(id),
      (id) => ({
        key: ['items'],
        updater: (current) => (current as Item[] | undefined)?.filter((item) => item.id !== id),
      }),
    )

    await expect(mutation.mutateAsync('a')).rejects.toThrow('boom')
    await flushPromises()

    expect(queryCache.getQueryData<Item[]>(['items'])?.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('cancels in-flight queries before patching the cache', async () => {
    const remove = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined)
    const { mutation, queryCache } = mountWithMutation(
      (id) => remove(id),
      (id) => ({
        key: ['items'],
        updater: (current) => (current as Item[] | undefined)?.filter((item) => item.id !== id),
      }),
    )
    const cancelSpy = vi.spyOn(queryCache, 'cancelQueries')

    await mutation.mutateAsync('a')
    await flushPromises()

    expect(cancelSpy).toHaveBeenCalledWith({ key: ['items'] })
  })

  it('supports multiple patches in one mutation', async () => {
    const remove = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined)
    const { mutation, queryCache } = mountWithMutation(
      (id) => remove(id),
      (id) => [
        {
          key: ['items'],
          updater: (current) => (current as Item[] | undefined)?.filter((item) => item.id !== id),
        },
        {
          key: ['count'],
          updater: () => 1,
        },
      ],
    )

    queryCache.setQueryData<number>(['count'], 2)

    await mutation.mutateAsync('a')
    await flushPromises()

    expect(queryCache.getQueryData<Item[]>(['items'])?.map((i) => i.id)).toEqual(['b'])
    expect(queryCache.getQueryData<number>(['count'])).toBe(1)
  })

  it('invalidates patch keys and extra keys on settle', async () => {
    const remove = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined)
    const { mutation, queryCache } = mountWithMutation(
      (id) => remove(id),
      (id) => ({
        key: ['items'],
        updater: (current) => (current as Item[] | undefined)?.filter((item) => item.id !== id),
      }),
      (id) => [['related', id]],
    )
    const invalidateSpy = vi.spyOn(queryCache, 'invalidateQueries')

    await mutation.mutateAsync('a')
    await flushPromises()

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0])
    expect(invalidatedKeys).toContainEqual({ key: ['items'] })
    expect(invalidatedKeys).toContainEqual({ key: ['related', 'a'] })
  })

  it('rolls back all snapshots on error with multiple patches', async () => {
    const remove = vi.fn<(id: string) => Promise<void>>().mockRejectedValue(new Error('boom'))
    const { mutation, queryCache } = mountWithMutation(
      (id) => remove(id),
      (id) => [
        {
          key: ['items'],
          updater: (current) => (current as Item[] | undefined)?.filter((item) => item.id !== id),
        },
        {
          key: ['count'],
          updater: () => 1,
        },
      ],
    )
    queryCache.setQueryData<number>(['count'], 2)

    await expect(mutation.mutateAsync('a')).rejects.toThrow('boom')
    await flushPromises()

    expect(queryCache.getQueryData<Item[]>(['items'])?.map((i) => i.id)).toEqual(['a', 'b'])
    expect(queryCache.getQueryData<number>(['count'])).toBe(2)
  })

  it('patches all entries matching keyPrefix', async () => {
    const remove = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined)
    const { mutation, queryCache } = mountWithMutation(
      (id) => remove(id),
      (id) => ({
        keyPrefix: ['items'],
        updater: (current) => (current as Item[] | undefined)?.filter((item) => item.id !== id),
      }),
    )
    // Simulate two filtered variants of the same list
    queryCache.setQueryData<Item[]>(['items', { filter: 'all' }], structuredClone(INITIAL_ITEMS))
    queryCache.setQueryData<Item[]>(['items', { filter: 'recent' }], [{ id: 'a', name: 'A' }])

    await mutation.mutateAsync('a')
    await flushPromises()

    expect(queryCache.getQueryData<Item[]>(['items', { filter: 'all' }])?.map((i) => i.id)).toEqual(
      ['b'],
    )
    expect(queryCache.getQueryData<Item[]>(['items', { filter: 'recent' }])).toEqual([])
  })
})
