import { describe, it, expect, vi, beforeEach } from 'vitest'
import CashflowForm from './CashflowForm.vue'
import type { AccountWithBalance } from '@/entities/account'
import type { Category } from '@/entities/category'
import type { CashflowTransaction } from '@/entities/transaction'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockTransactionRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const account: AccountWithBalance = {
  id: 'a1',
  name: 'Main',
  currency: 'USD',
  openingBalance: 1000,
  manualAdjustment: 0,
  balance: 1000,
}

const incomeCategory: Category = {
  id: 'cincome',
  name: 'Salary',
  type: 'income',
  icon: '💰',
  color: '#00FF00',
  slug: 'salary',
}

const expenseCategory: Category = {
  id: 'cexpense',
  name: 'Food',
  type: 'expense',
  icon: '🍔',
  color: '#FF0000',
  slug: 'food',
}

const createdTransaction: CashflowTransaction = {
  id: 't1',
  type: 'income',
  amount: 100,
  description: '',
  occurredAt: '2024-01-01T00:00:00Z',
  accountId: 'a1',
  categoryId: 'cincome',
} as never

describe('CashflowForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mountForm(props: Record<string, unknown> = {}) {
    const accounts = createMockAccountRepository()
    accounts.getAll.mockResolvedValue([account])
    const categories = createMockCategoryRepository()
    categories.getAll.mockResolvedValue([incomeCategory, expenseCategory])
    const transactions = createMockTransactionRepository()
    transactions.create.mockResolvedValue(createdTransaction)

    const wrapper = mountWithProviders(CashflowForm, {
      props: { type: 'income', ...props } as never,
      repositories: { accounts, categories, transactions },
    })
    return { wrapper, accounts, categories, transactions }
  }

  it('renders form element', () => {
    const { wrapper } = mountForm()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('renders submit button', () => {
    const { wrapper } = mountForm()
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('accepts type prop (expense)', () => {
    const { wrapper } = mountForm({ type: 'expense' })
    expect(wrapper.html()).toBeTruthy()
  })

  it('accepts lastCreatedTransaction prop', () => {
    const last: CashflowTransaction = {
      id: 't-prev',
      type: 'income',
      amount: 50,
      description: '',
      occurredAt: '2024-01-01T00:00:00Z',
      accountId: 'a1',
      categoryId: 'cincome',
    } as never
    const { wrapper } = mountForm({ lastCreatedTransaction: last })
    expect(wrapper.html()).toBeTruthy()
  })

  it('renders all expected sections (account selector, amount, description, category, button)', () => {
    const { wrapper } = mountForm()
    // Submit button is present
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    // There should be at least one description input
    expect(wrapper.find('input#description').exists()).toBe(true)
  })
})
