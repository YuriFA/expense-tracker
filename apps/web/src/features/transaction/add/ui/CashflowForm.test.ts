import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import CashflowForm from './CashflowForm.vue'
import { AccountSelect } from '@/entities/account'
import { CategorySelect } from '@/entities/category'
import { AmountField } from '@/shared/ui/amount-field'
import { Calendar } from '@/shared/ui/calendar'
import { toDateValue } from '@/shared/lib/date'
import type { AccountWithBalance } from '@/entities/account'
import type { Category } from '@/entities/category'
import type { CashflowTransaction } from '@/entities/transaction'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockTransactionRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

// Pin the form-open instant: the date field defaults to it and a day-level
// pick keeps its clock time (asserted below).
const { openMoment } = vi.hoisted(() => ({ openMoment: '2026-08-29T10:20:30.400Z' }))
vi.mock('@/shared/lib/date', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/date')>()
  return { ...actual, nowIsoString: () => openMoment }
})

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

const createdTransaction: CashflowTransaction = {
  id: 't1',
  type: 'income',
  amount: 100,
  description: '',
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

describe('CashflowForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(async () => {
    // Unmount first: wiping document.body under live teleports (the inline
    // dialogs) breaks patching.
    for (const wrapper of mounted.splice(0)) {
      wrapper.unmount()
    }
    await flushPromises()
    document.body.innerHTML = ''
  })

  function mountForm(
    props: Record<string, unknown> = {},
    accountsList: AccountWithBalance[] = [account],
  ) {
    const accounts = createMockAccountRepository()
    accounts.getAll.mockResolvedValue(accountsList)
    const categories = createMockCategoryRepository()
    categories.getAll.mockResolvedValue([incomeCategory, expenseCategory])
    const transactions = createMockTransactionRepository()
    transactions.create.mockResolvedValue(createdTransaction)

    const wrapper = mountWithProviders(CashflowForm, {
      props: { type: 'income', ...props } as never,
      repositories: { accounts, categories, transactions },
      // The footer's DialogClose requires a DialogRoot the tests don't mount.
      global: { stubs: { DialogClose: true } },
    })
    mounted.push(wrapper)
    return { wrapper, accounts, categories, transactions }
  }

  it('offers the inline account creation affordance next to the account select', () => {
    const { wrapper } = mountForm()
    expect(wrapper.find('[data-testid="open-new-account"]').exists()).toBe(true)
  })

  it('auto-selects an account created inline over a zero-account cold start, preserving entered values', async () => {
    const { wrapper, accounts, transactions } = mountForm({}, [])
    accounts.create.mockResolvedValue(newAccount)
    await flushPromises()

    // Values entered before the inline creation must survive it.
    wrapper.findComponent(AmountField).vm.$emit('update:modelValue', 100)
    await wrapper.find('input#description').setValue('Salary')

    await wrapper.find('[data-testid="open-new-account"]').trigger('click')
    await flushPromises()
    // The dialog content teleports to document.body.
    const name = document.querySelector('input[id="new-account-name"]') as HTMLInputElement
    name.value = 'Card'
    name.dispatchEvent(new Event('input', { bubbles: true }))
    ;(
      document.querySelector('button[type="submit"][form="new-account-form"]') as HTMLElement
    ).click()
    await vi.waitFor(() => expect(accounts.create).toHaveBeenCalledTimes(1))
    await flushPromises()

    // The created account is auto-selected in the triggering selector.
    expect(wrapper.findComponent(AccountSelect).props('modelValue')).toBe('a-new')

    wrapper.findComponent(CategorySelect).vm.$emit('update:modelValue', 'cincome')
    await nextTick()
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(transactions.create).toHaveBeenCalledTimes(1))

    expect(transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'a-new',
        amount: 10000,
        description: 'Salary',
      }),
    )
  })

  it('renders form with submit button and description input', () => {
    const { wrapper } = mountForm()
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    expect(wrapper.find('input#description').exists()).toBe(true)
  })

  it('submits the form-open moment when the date is untouched', async () => {
    const { wrapper, transactions } = mountForm()
    await flushPromises()

    await fillAndSubmit(wrapper)
    // vee-validate resolves the async schema on its own schedule; poll
    // instead of a fixed flush count.
    await vi.waitFor(() => expect(transactions.create).toHaveBeenCalledTimes(1))

    expect(transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({ occurredAt: openMoment }),
    )
  })

  it('replaces the picked day while preserving the form-open clock time', async () => {
    const { wrapper, transactions } = mountForm()
    await flushPromises()

    // The calendar mounts with its popover; picking a day closes it again.
    await wrapper.find('#occurred-at').trigger('click')
    await nextTick()
    wrapper.findComponent(Calendar).vm.$emit('update:modelValue', toDateValue('2024-05-10'))

    await fillAndSubmit(wrapper)
    await vi.waitFor(() => expect(transactions.create).toHaveBeenCalledTimes(1))

    expect(transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({ occurredAt: '2024-05-10T10:20:30.400Z' }),
    )
  })
})

async function fillAndSubmit(wrapper: VueWrapper) {
  wrapper.findComponent(AccountSelect).vm.$emit('update:modelValue', 'a1')
  wrapper.findComponent(CategorySelect).vm.$emit('update:modelValue', 'cincome')
  wrapper.findComponent(AmountField).vm.$emit('update:modelValue', 100)
  await nextTick()
  await wrapper.find('form').trigger('submit')
}
