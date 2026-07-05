import { describe, it, expect, vi, beforeEach } from 'vitest'
import CashflowEditForm from './CashflowEditForm.vue'
import type { AccountWithBalance } from '@/entities/account'
import type { Category } from '@/entities/category'
import type { CashflowTransaction } from '@/entities/transaction'
import {
  createMockAccountRepository,
  createMockCategoryRepository,
  createMockTransactionRepository,
} from '@/__tests__/helpers/mock-repositories'
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

const existingTransaction: CashflowTransaction = {
  id: 't1',
  type: 'income',
  amount: 100,
  description: 'Salary',
  occurredAt: '2024-01-01T00:00:00Z',
  accountId: 'a1',
  categoryId: 'cincome',
} as never

describe('CashflowEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mountForm(props: Record<string, unknown> = {}) {
    const accounts = createMockAccountRepository()
    accounts.getAll.mockResolvedValue([account])
    const categories = createMockCategoryRepository()
    categories.getAll.mockResolvedValue([incomeCategory, expenseCategory])
    const transactions = createMockTransactionRepository()
    transactions.update.mockResolvedValue(existingTransaction)

    const wrapper = mountWithProviders(CashflowEditForm, {
      props: {
        id: 't1',
        type: 'income',
        amount: 100,
        description: 'Salary',
        accountId: 'a1',
        categoryId: 'cincome',
        ...props,
      } as never,
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
    const { wrapper } = mountForm({
      type: 'expense',
      categoryId: 'cexpense',
    })
    expect(wrapper.html()).toBeTruthy()
  })

  it('preloads form with initial values', () => {
    const { wrapper } = mountForm()
    expect(wrapper.find('input#description').attributes('value')).toBe('Salary')
  })
})
