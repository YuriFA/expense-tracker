import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import CashflowEditForm from './CashflowEditForm.vue'
import { AccountSelect } from '@/entities/account'
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
  version: 1,
  id: 'a1',
  name: 'Main',
  currency: 'USD',
  openingBalance: 1000,
  balance: 1000,
}

const incomeCategory: Category = {
  version: 1,
  id: 'cincome',
  name: 'Salary',
  type: 'income',
  icon: '💰',
  color: '#00FF00',
  archivedAt: null,
  slug: 'salary',
}

const expenseCategory: Category = {
  version: 1,
  id: 'cexpense',
  name: 'Food',
  type: 'expense',
  icon: '🍔',
  color: '#FF0000',
  archivedAt: null,
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

const newAccount: AccountWithBalance = {
  version: 1,
  id: 'a-new',
  name: 'Card',
  currency: 'RUB',
  openingBalance: 0,
  balance: 0,
}

const mounted: ReturnType<typeof mountWithProviders>[] = []

describe('CashflowEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(async () => {
    // Unmount first: wiping document.body under live teleports (the inline
    // dialog) breaks patching.
    for (const wrapper of mounted.splice(0)) {
      wrapper.unmount()
    }
    await flushPromises()
    document.body.innerHTML = ''
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
      // The footer's DialogClose requires a DialogRoot the tests don't mount.
      global: { stubs: { DialogClose: true } },
    })
    mounted.push(wrapper)
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

  it('preloads form with initial values', () => {
    const { wrapper } = mountForm()
    expect(wrapper.find('input#description').attributes('value')).toBe('Salary')
  })

  it('auto-selects an account created inline next to the account select', async () => {
    const { wrapper, accounts } = mountForm()
    accounts.create.mockResolvedValue(newAccount)
    await flushPromises()

    await wrapper.find('[data-testid="open-new-account"]').trigger('click')
    await flushPromises()
    // The dialog content teleports to document.body.
    const name = document.querySelector('input[id="new-account-name"]') as HTMLInputElement
    name.value = 'Card'
    name.dispatchEvent(new Event('input', { bubbles: true }))
    ;(
      document.querySelector('#new-account-form button[type="submit"]') as HTMLElement
    ).click()
    await vi.waitFor(() => expect(accounts.create).toHaveBeenCalledTimes(1))
    await flushPromises()

    expect(wrapper.findComponent(AccountSelect).props('modelValue')).toBe('a-new')
  })
})
