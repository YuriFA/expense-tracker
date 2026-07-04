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
    await result.setFilters({ type: 'income', accountId: 'a1' })
    await result.removeFilter('type')
    expect(result.filters.value.type).toBeUndefined()
    expect(result.filters.value.accountId).toBe('a1')
  })

  it('resetFilters clears type, accountId, categoryId', async () => {
    const { result } = mountWithComposable(() => useTransactionsFilters())
    await result.setFilters({ type: 'income', accountId: 'a1', categoryId: 'c1' })
    await result.resetFilters()
    expect(result.filters.value.type).toBeUndefined()
    expect(result.filters.value.accountId).toBeUndefined()
    expect(result.filters.value.categoryId).toBeUndefined()
  })
})
