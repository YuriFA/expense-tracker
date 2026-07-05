import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import TransactionListItem from './TransactionListItem.vue'
import type { CashflowTransaction, Transaction, TransferTransaction } from '../model/types'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const incomeAccount = {
  id: 'a1',
  name: 'Main',
  openingBalance: 1000,
  manualAdjustment: 0,
  balance: 1000,
}

const savingsAccount = {
  ...incomeAccount,
  id: 'a2',
  name: 'Savings',
}

const expenseCategory = {
  id: 'c1',
  name: 'Food',
  type: 'expense' as const,
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

function mountWithTransaction(
  transaction: Transaction,
  accounts: unknown[] = [incomeAccount, savingsAccount],
  categories: unknown[] = [expenseCategory],
) {
  return mountWithProviders(TransactionListItem, {
    props: { transaction, accounts, categories } as never,
    repositories: {},
  })
}

describe('TransactionListItem', () => {
  it('renders income transaction with description and category', async () => {
    const wrapper = mountWithTransaction(incomeTransaction)
    await flushPromises()
    expect(wrapper.text()).toContain('Salary')
    expect(wrapper.text()).toContain('Food')
    expect(wrapper.text()).toContain('+')
  })

  it('renders expense transaction with minus sign', async () => {
    const wrapper = mountWithTransaction(expenseTransaction)
    await flushPromises()
    expect(wrapper.text()).toContain('Lunch')
    expect(wrapper.text()).toContain('-')
  })

  it('renders transfer transaction with account names', async () => {
    const wrapper = mountWithTransaction(transferTransaction)
    await flushPromises()
    expect(wrapper.text()).toContain('Main')
    expect(wrapper.text()).toContain('Savings')
  })

  it('renders transfer fallback when account missing', async () => {
    const wrapper = mountWithTransaction(transferTransaction, [], [])
    await flushPromises()
    // When accounts are unknown, the "from -> to" span is hidden and the
    // generic transfer-type label is rendered instead.
    expect(wrapper.text()).not.toContain('->')
  })

  it('renders category icon for cashflow transaction', async () => {
    const wrapper = mountWithTransaction(incomeTransaction)
    await flushPromises()
    expect(wrapper.text()).toContain('🍔')
  })

  it('renders actions slot content', async () => {
    const wrapper = mountWithProviders(TransactionListItem, {
      props: { transaction: incomeTransaction, accounts: [], categories: [] } as never,
      slots: { actions: '<button data-test="action-btn">Action</button>' },
      repositories: {},
    })
    await flushPromises()
    expect(wrapper.find('[data-test="action-btn"]').exists()).toBe(true)
  })
})
