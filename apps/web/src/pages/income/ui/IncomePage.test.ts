import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import IncomePage from './IncomePage.vue'
import {
  createMockAccountRepository,
  createMockCategoryRepository,
  createMockTransactionRepository,
} from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('IncomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mountPage() {
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue([])
    const categoriesRepo = createMockCategoryRepository()
    categoriesRepo.getAll.mockResolvedValue([])
    const transactionsRepo = createMockTransactionRepository()

    const wrapper = mountWithProviders(IncomePage, {
      repositories: {
        accounts: accountsRepo,
        categories: categoriesRepo,
        transactions: transactionsRepo,
      },
    })
    return { wrapper, transactionsRepo }
  }

  it('renders the income cashflow form (amount, account, category, description)', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Income')
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('#description').exists()).toBe(true)
    // The account select and the income-category select are present.
    expect(wrapper.find('#account-id').exists()).toBe(true)
    expect(wrapper.find('#category-id').exists()).toBe(true)
  })
})
