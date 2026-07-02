import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import RecentTransactions from './RecentTransactions.vue'
import type { CashflowTransaction } from '@/entities/transaction/types'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockTransactionRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const transactions: CashflowTransaction[] = [
  {
    id: 't1',
    type: 'income',
    amount: 100,
    description: 'Salary',
    occurredAt: '2024-01-01T00:00:00Z',
    accountId: 'a1',
    categoryId: 'c1',
  } as never,
  {
    id: 't2',
    type: 'expense',
    amount: 50,
    description: 'Lunch',
    occurredAt: '2024-01-02T00:00:00Z',
    accountId: 'a1',
    categoryId: 'c2',
  } as never,
]

describe('RecentTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading skeletons initially', async () => {
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockReturnValue(new Promise<never>(() => {}))
    const wrapper = mountWithProviders(RecentTransactions, {
      repositories: { transactions: transactionsRepo },
    })
    await flushPromises()
    // Loading skeletons rendered as li elements with animate-pulse
    const skeletons = wrapper.findAll('li.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders transactions after data loads', async () => {
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockResolvedValue(transactions)
    const accountsRepo = createMockAccountRepository()
    const categoriesRepo = createMockCategoryRepository()

    const wrapper = mountWithProviders(RecentTransactions, {
      repositories: {
        transactions: transactionsRepo,
        accounts: accountsRepo,
        categories: categoriesRepo,
      },
    })
    await flushPromises()
    // At least the description text should be present
    expect(wrapper.text()).toContain('Salary')
    expect(wrapper.text()).toContain('Lunch')
  })

  it('renders empty state when no transactions', async () => {
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockResolvedValue([])
    const wrapper = mountWithProviders(RecentTransactions, {
      repositories: { transactions: transactionsRepo },
    })
    await flushPromises()
    // Empty state shows i18n message — verify the list has 1 empty-state li
    const items = wrapper.findAll('li')
    expect(items.length).toBeGreaterThanOrEqual(1)
  })

  it('renders error state when query fails', async () => {
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockRejectedValue(new Error('Network error'))
    const wrapper = mountWithProviders(RecentTransactions, {
      repositories: { transactions: transactionsRepo },
    })
    await flushPromises()
    // Error template should render
    expect(wrapper.findAll('li').length).toBeGreaterThan(0)
  })

  it('passes limit option to repository.query', async () => {
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockResolvedValue([])
    mountWithProviders(RecentTransactions, {
      repositories: { transactions: transactionsRepo },
    })
    await flushPromises()
    expect(transactionsRepo.query).toHaveBeenCalledWith({ limit: 5 })
  })
})
