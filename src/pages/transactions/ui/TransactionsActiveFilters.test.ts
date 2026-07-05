import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import TransactionsActiveFilters from './TransactionsActiveFilters.vue'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('TransactionsActiveFilters', () => {
  it('renders nothing when no filters are active', async () => {
    const accounts = createMockAccountRepository()
    accounts.getById.mockResolvedValue(null)
    const categories = createMockCategoryRepository()
    categories.getById.mockResolvedValue(null)

    const wrapper = mountWithProviders(TransactionsActiveFilters, {
      repositories: { accounts, categories },
    })
    await flushPromises()
    // No chip should be rendered
    const chips = wrapper.findAll('[role="button"]')
    expect(chips.length).toBe(0)
  })
})
