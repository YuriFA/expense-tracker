import { describe, it, expect, vi, beforeEach } from 'vitest'
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
  manualAdjustment: 0,
  balance: 1000,
}

const incomeCategory: Category = {
  version: 1,
  id: 'cincome',
  name: 'Salary',
  type: 'income',
  icon: '💰',
  color: '#00FF00',
  slug: 'salary',
}

const expenseCategory: Category = {
  version: 1,
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
