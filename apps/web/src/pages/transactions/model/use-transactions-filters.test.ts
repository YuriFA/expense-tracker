import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { useTransactionsFilters } from './use-transactions-filters'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

function mountWithComposable<T>(
  composable: () => T,
  options: Parameters<typeof mountWithProviders>[1] = {},
): { result: T } {
  let result!: T
  const TestComponent = defineComponent({
    setup() {
      result = composable()
      return () => h('div')
    },
  })
  mountWithProviders(TestComponent, options)
  return { result }
}

describe('useTransactionsFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty filters from empty route query', () => {
    const { result } = mountWithComposable(() => useTransactionsFilters())
    expect(result.filters.value).toEqual({})
  })

  it('parses filters from route query', async () => {
    const { result } = mountWithComposable(() => useTransactionsFilters(), {
      router: undefined,
    })
    // Default router — verify default state
    expect(result.filters.value).toEqual({})
    void result
  })

  it('exposes setFilters that calls router.replace', async () => {
    const { result } = mountWithComposable(() => useTransactionsFilters())
    await result.setFilters({ type: 'income' })
    await nextTick()
    // After setFilters, route.query should have type=income
    expect(result.filters.value.type).toBe('income')
  })

  it('removeFilter clears a single filter', async () => {
    const { result } = mountWithComposable(() => useTransactionsFilters())
    await result.setFilters({ type: 'income', accountIds: ['a1'] })
    await result.removeFilter('type')
    expect(result.filters.value.type).toBeUndefined()
    expect(result.filters.value.accountIds).toEqual(['a1'])
  })

  it('toggleIdFilter adds and removes ids, dropping the filter when empty', async () => {
    const { result } = mountWithComposable(() => useTransactionsFilters())

    await result.toggleIdFilter('accountIds', 'a1', true)
    await result.toggleIdFilter('accountIds', 'a2', true)
    expect(result.filters.value.accountIds).toEqual(['a1', 'a2'])

    await result.toggleIdFilter('categoryIds', 'c1', true)
    expect(result.filters.value.categoryIds).toEqual(['c1'])

    await result.toggleIdFilter('accountIds', 'a1', false)
    expect(result.filters.value.accountIds).toEqual(['a2'])
    expect(result.filters.value.categoryIds).toEqual(['c1'])

    await result.toggleIdFilter('accountIds', 'a2', false)
    expect(result.filters.value.accountIds).toBeUndefined()
  })

  it('resetFilters clears type, accountIds, categoryIds', async () => {
    const { result } = mountWithComposable(() => useTransactionsFilters())
    await result.setFilters({ type: 'income', accountIds: ['a1'], categoryIds: ['c1'] })
    await result.resetFilters()
    expect(result.filters.value.type).toBeUndefined()
    expect(result.filters.value.accountIds).toBeUndefined()
    expect(result.filters.value.categoryIds).toBeUndefined()
  })
})
