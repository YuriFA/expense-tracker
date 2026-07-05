import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import TransferForm from './TransferForm.vue'
import type { AccountWithBalance } from '@/entities/account'
import type { Category } from '@/entities/category'
import type { TransferTransaction } from '@/entities/transaction'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockTransactionRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const accounts: AccountWithBalance[] = [
  { id: 'a1', name: 'Main', openingBalance: 1000, manualAdjustment: 0, balance: 1000 },
  { id: 'a2', name: 'Savings', openingBalance: 500, manualAdjustment: 0, balance: 500 },
]

const categories: Category[] = []

const createdTransfer: TransferTransaction = {
  id: 't1',
  type: 'transfer',
  amount: 100,
  description: '',
  occurredAt: '2024-01-01T00:00:00Z',
  fromAccountId: 'a1',
  toAccountId: 'a2',
} as never

describe('TransferForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mountForm(props: Record<string, unknown> = {}) {
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue(accounts)
    const categoriesRepo = createMockCategoryRepository()
    categoriesRepo.getAll.mockResolvedValue(categories)
    const transactionsRepo = createMockTransactionRepository()
    transactionsRepo.create.mockResolvedValue(createdTransfer)

    const wrapper = mountWithProviders(TransferForm, {
      props: { ...props } as never,
      repositories: { accounts: accountsRepo, categories: categoriesRepo, transactions: transactionsRepo },
    })
    return { wrapper, accountsRepo, categoriesRepo, transactionsRepo }
  }

  it('renders form element', () => {
    const { wrapper } = mountForm()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('renders submit button', () => {
    const { wrapper } = mountForm()
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('renders description input', () => {
    const { wrapper } = mountForm()
    expect(wrapper.find('input#transfer-description').exists()).toBe(true)
  })

  it('renders without lastCreatedTransaction prop', () => {
    const { wrapper } = mountForm()
    expect(wrapper.html()).toBeTruthy()
  })

  it('accepts lastCreatedTransaction prop', () => {
    const last: TransferTransaction = {
      id: 't-prev',
      type: 'transfer',
      amount: 50,
      description: '',
      occurredAt: '2024-01-01T00:00:00Z',
      fromAccountId: 'a1',
      toAccountId: 'a2',
    } as never
    const { wrapper } = mountForm({ lastCreatedTransaction: last })
    expect(wrapper.html()).toBeTruthy()
  })

  it('mounts and renders with accounts data loaded', async () => {
    const { wrapper, accountsRepo } = mountForm()
    await flushPromises()
    expect(accountsRepo.getAll).toHaveBeenCalled()
    expect(wrapper.find('form').exists()).toBe(true)
  })
})
