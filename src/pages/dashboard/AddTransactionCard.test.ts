import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import AddTransactionCard from './AddTransactionCard.vue'
import AddTransactionForm from '@/features/add-transaction/AddTransactionForm.vue'
import AddTransferForm from '@/features/add-transfer/AddTransferForm.vue'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockTransactionRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'
import type { AccountWithBalance } from '@/entities/account/types'
import type { Transaction } from '@/entities/transaction/types'

const accounts: AccountWithBalance[] = [
  { id: 'a1', name: 'Main', openingBalance: 1000, manualAdjustment: 0, balance: 1000 },
]

describe('AddTransactionCard', () => {
  it('renders card title', async () => {
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue(accounts)
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockResolvedValue([])
    const categoriesRepo = createMockCategoryRepository()

    const wrapper = mountWithProviders(AddTransactionCard, {
      repositories: { accounts: accountsRepo, categories: categoriesRepo, transactions: transactionsRepo },
    })
    await flushPromises()
    // Card title is rendered (translated from addTransaction.newTransaction)
    const cardTitle = wrapper.find('[class*="text-muted-foreground"]')
    expect(cardTitle.exists()).toBe(true)
    expect(cardTitle.text()).toBeTruthy()
  })

  it('renders form components after data loads', async () => {
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue(accounts)
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockResolvedValue([] as Transaction[])
    const categoriesRepo = createMockCategoryRepository()

    const wrapper = mountWithProviders(AddTransactionCard, {
      repositories: { accounts: accountsRepo, categories: categoriesRepo, transactions: transactionsRepo },
    })
    await flushPromises()
    // After loading, form components should be present
    expect(wrapper.findComponent(AddTransactionForm).exists() || wrapper.findComponent(AddTransferForm).exists()).toBe(true)
  })

  it('renders tabs for each transaction type', async () => {
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue(accounts)
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.query.mockResolvedValue([])
    const categoriesRepo = createMockCategoryRepository()

    const wrapper = mountWithProviders(AddTransactionCard, {
      repositories: { accounts: accountsRepo, categories: categoriesRepo, transactions: transactionsRepo },
    })
    await flushPromises()
    // Should have multiple tabs (expense, income, transfer)
    const tabTriggers = wrapper.findAll('[role="tab"]')
    expect(tabTriggers.length).toBeGreaterThanOrEqual(3)
  })
})
