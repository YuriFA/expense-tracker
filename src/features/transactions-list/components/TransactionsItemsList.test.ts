import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import TransactionsItemsList from './TransactionsItemsList.vue'
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
]

describe('TransactionsItemsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading skeletons initially', async () => {
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockReturnValue(new Promise<never>(() => {}))
    const wrapper = mountWithProviders(TransactionsItemsList, {
      repositories: { transactions: transactionsRepo },
    })
    await flushPromises()
    const skeletons = wrapper.findAll('li.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders transactions after data loads', async () => {
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockResolvedValue(transactions)
    const accountsRepo = createMockAccountRepository()
    const categoriesRepo = createMockCategoryRepository()

    const wrapper = mountWithProviders(TransactionsItemsList, {
      repositories: {
        transactions: transactionsRepo,
        accounts: accountsRepo,
        categories: categoriesRepo,
      },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Salary')
  })

  it('renders empty state when no transactions', async () => {
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockResolvedValue([])
    const wrapper = mountWithProviders(TransactionsItemsList, {
      repositories: { transactions: transactionsRepo },
    })
    await flushPromises()
    expect(wrapper.findAll('li').length).toBeGreaterThanOrEqual(1)
  })

  it('renders error state when query fails', async () => {
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockRejectedValue(new Error('fail'))
    const wrapper = mountWithProviders(TransactionsItemsList, {
      repositories: { transactions: transactionsRepo },
    })
    await flushPromises()
    expect(wrapper.findAll('li').length).toBeGreaterThan(0)
  })
})
