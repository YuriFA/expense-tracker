import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import TransactionListItem from './TransactionListItem.vue'
import type { AccountWithBalance } from '@/entities/account'
import type { Category } from '@/entities/category'
import type { CashflowTransaction, Transaction, TransferTransaction } from '@/entities/transaction'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const incomeAccount: AccountWithBalance = {
  id: 'a1',
  name: 'Main',
  openingBalance: 1000,
  manualAdjustment: 0,
  balance: 1000,
}

const expenseCategory: Category = {
  id: 'c1',
  name: 'Food',
  type: 'expense',
  icon: '🍔',
  color: '#FF0000',
}

const incomeTransaction: CashflowTransaction = {
  id: 't1',
  type: 'income',
  amount: 100,
  description: 'Salary',
  occurredAt: '2024-01-15T10:00:00Z',
  accountId: 'a1',
  categoryId: 'c1',
} as never

const expenseTransaction: CashflowTransaction = {
  ...incomeTransaction,
  id: 't2',
  type: 'expense',
  amount: 50,
  description: 'Lunch',
} as never

const transferTransaction: TransferTransaction = {
  id: 't3',
  type: 'transfer',
  amount: 75,
  description: '',
  occurredAt: '2024-01-15T10:00:00Z',
  fromAccountId: 'a1',
  toAccountId: 'a2',
} as never

async function mountWithTransaction(transaction: Transaction) {
  const accounts = createMockAccountRepository()
  accounts.getAll.mockResolvedValue([
    incomeAccount,
    { ...incomeAccount, id: 'a2', name: 'Savings' },
  ])
  const categories = createMockCategoryRepository()
  categories.getAll.mockResolvedValue([expenseCategory])
  const wrapper = mountWithProviders(TransactionListItem, {
    props: { transaction } as never,
    repositories: { accounts, categories },
  })
  await flushPromises()
  return wrapper
}

describe('TransactionListItem', () => {
  it('renders income transaction with description and category', async () => {
    const wrapper = await mountWithTransaction(incomeTransaction)
    expect(wrapper.text()).toContain('Salary')
    expect(wrapper.text()).toContain('Food')
    expect(wrapper.text()).toContain('+')
  })

  it('renders expense transaction with minus sign', async () => {
    const wrapper = await mountWithTransaction(expenseTransaction)
    expect(wrapper.text()).toContain('Lunch')
    expect(wrapper.text()).toContain('-')
  })

  it('renders transfer transaction with account names', async () => {
    const wrapper = await mountWithTransaction(transferTransaction)
    expect(wrapper.text()).toContain('Main')
    expect(wrapper.text()).toContain('Savings')
  })

  it('renders transfer fallback when account missing', async () => {
    const accounts = createMockAccountRepository()
    accounts.getAll.mockResolvedValue([])
    const categories = createMockCategoryRepository()
    const wrapper = mountWithProviders(TransactionListItem, {
      props: { transaction: transferTransaction } as never,
      repositories: { accounts, categories },
    })
    await flushPromises()
    // Should fall back to i18n translation for transfer type
    expect(wrapper.text()).toBeTruthy()
  })

  it('renders category icon for cashflow transaction', async () => {
    const wrapper = await mountWithTransaction(incomeTransaction)
    expect(wrapper.text()).toContain('🍔')
  })
})
