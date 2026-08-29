import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import RecentTransactions from './RecentTransactions.vue'
import type { CashflowTransaction } from '@/entities/transaction'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockTransactionRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const RANGE = { fromDate: '2024-01-01', toDate: '2024-01-31' }
const NEXT_RANGE = { fromDate: '2023-12-01', toDate: '2023-12-31' }

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

const neverResolves = () => new Promise<never>(() => {})

describe('RecentTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading skeletons initially', async () => {
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockReturnValue(neverResolves())
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockReturnValue(neverResolves())
    const categoriesRepo = createMockCategoryRepository()
    categoriesRepo.getAll.mockReturnValue(neverResolves())

    const wrapper = mountWithProviders(RecentTransactions, {
      props: { range: RANGE },
      repositories: {
        transactions: transactionsRepo,
        accounts: accountsRepo,
        categories: categoriesRepo,
      },
    })
    await flushPromises()
    const skeletons = wrapper.findAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders transactions after data loads', async () => {
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockResolvedValue(transactions)
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue([])
    const categoriesRepo = createMockCategoryRepository()
    categoriesRepo.getAll.mockResolvedValue([])

    const wrapper = mountWithProviders(RecentTransactions, {
      props: { range: RANGE },
      repositories: {
        transactions: transactionsRepo,
        accounts: accountsRepo,
        categories: categoriesRepo,
      },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Salary')
    expect(wrapper.text()).toContain('Lunch')
  })

  it('renders empty state when no transactions', async () => {
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockResolvedValue([])
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue([])
    const categoriesRepo = createMockCategoryRepository()
    categoriesRepo.getAll.mockResolvedValue([])

    const wrapper = mountWithProviders(RecentTransactions, {
      props: { range: RANGE },
      repositories: {
        transactions: transactionsRepo,
        accounts: accountsRepo,
        categories: categoriesRepo,
      },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('No transactions found')
    expect(wrapper.find('[data-slot="skeleton"]').exists()).toBe(false)
  })

  it('renders error state when query fails', async () => {
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockRejectedValue(new Error('Network error'))
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue([])
    const categoriesRepo = createMockCategoryRepository()
    categoriesRepo.getAll.mockResolvedValue([])

    const wrapper = mountWithProviders(RecentTransactions, {
      props: { range: RANGE },
      repositories: {
        transactions: transactionsRepo,
        accounts: accountsRepo,
        categories: categoriesRepo,
      },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.find('[data-slot="skeleton"]').exists()).toBe(false)
  })

  it('scopes the repository query to the selected month with the limit', async () => {
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockResolvedValue([])
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue([])
    const categoriesRepo = createMockCategoryRepository()
    categoriesRepo.getAll.mockResolvedValue([])
    mountWithProviders(RecentTransactions, {
      props: { range: RANGE },
      repositories: {
        transactions: transactionsRepo,
        accounts: accountsRepo,
        categories: categoriesRepo,
      },
    })
    await flushPromises()
    expect(transactionsRepo.query).toHaveBeenCalledWith({ limit: 5, ...RANGE })
  })

  it('re-queries when the selected month range changes', async () => {
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockResolvedValue([])
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue([])
    const categoriesRepo = createMockCategoryRepository()
    categoriesRepo.getAll.mockResolvedValue([])
    const wrapper = mountWithProviders(RecentTransactions, {
      props: { range: RANGE },
      repositories: {
        transactions: transactionsRepo,
        accounts: accountsRepo,
        categories: categoriesRepo,
      },
    })
    await flushPromises()
    vi.clearAllMocks()
    await wrapper.setProps({ range: NEXT_RANGE })
    await flushPromises()
    expect(transactionsRepo.query).toHaveBeenCalledWith({ limit: 5, ...NEXT_RANGE })
  })
})
