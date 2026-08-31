import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import TransferForm from './TransferForm.vue'
import { AccountSelect } from '@/entities/account'
import { AmountField } from '@/shared/ui/amount-field'
import { Calendar } from '@/shared/ui/calendar'
import { toDateValue } from '@/shared/lib/date'
import type { AccountWithBalance } from '@/entities/account'
import type { Category } from '@/entities/category'
import type { TransferTransaction } from '@/entities/transaction'
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

const accounts: AccountWithBalance[] = [
  { id: 'a1', name: 'Main', currency: 'USD', openingBalance: 1000, manualAdjustment: 0, balance: 1000, version: 1 },
  { id: 'a2', name: 'Savings', currency: 'USD', openingBalance: 500, manualAdjustment: 0, balance: 500, version: 1 },
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
      // The footer's DialogClose requires a DialogRoot the tests don't mount.
      global: { stubs: { DialogClose: true } },
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

  it('mounts and renders with accounts data loaded', async () => {
    const { wrapper, accountsRepo } = mountForm()
    await flushPromises()
    expect(accountsRepo.getAll).toHaveBeenCalled()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('submits the form-open moment when the date is untouched', async () => {
    const { wrapper, transactionsRepo } = mountForm()
    await flushPromises()

    await fillAndSubmit(wrapper)
    // vee-validate resolves the async schema on its own schedule; poll
    // instead of a fixed flush count.
    await vi.waitFor(() => expect(transactionsRepo.create).toHaveBeenCalledTimes(1))

    expect(transactionsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ occurredAt: openMoment }),
    )
  })

  it('replaces the picked day while preserving the form-open clock time', async () => {
    const { wrapper, transactionsRepo } = mountForm()
    await flushPromises()

    // The calendar mounts with its popover; picking a day closes it again.
    await wrapper.find('#transfer-occurred-at').trigger('click')
    await nextTick()
    wrapper.findComponent(Calendar).vm.$emit('update:modelValue', toDateValue('2024-05-10'))

    await fillAndSubmit(wrapper)
    await vi.waitFor(() => expect(transactionsRepo.create).toHaveBeenCalledTimes(1))

    expect(transactionsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ occurredAt: '2024-05-10T10:20:30.400Z' }),
    )
  })
})

async function fillAndSubmit(wrapper: VueWrapper) {
  const selects = wrapper.findAllComponents(AccountSelect)
  selects.find((s) => s.props('inputId') === 'from-account-id')?.vm.$emit('update:modelValue', 'a1')
  selects.find((s) => s.props('inputId') === 'to-account-id')?.vm.$emit('update:modelValue', 'a2')
  wrapper.findComponent(AmountField).vm.$emit('update:modelValue', 100)
  await nextTick()
  await wrapper.find('form').trigger('submit')
}
