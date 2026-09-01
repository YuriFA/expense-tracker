import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import ReconcileAccountForm from './ReconcileAccountForm.vue'
import { AmountField } from '@/shared/ui/amount-field'
import type { AccountWithBalance } from '@/entities/account'
import type { AdjustmentTransaction } from '@/entities/transaction'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockTransactionRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'


const account: AccountWithBalance = {
  version: 1,
  id: 'a1',
  name: 'Наличные',
  currency: 'RUB',
  openingBalance: 12_000,
  balance: 12_000,
}

const createdAdjustment: AdjustmentTransaction = {
  id: 'adj1',
  type: 'adjustment',
  amount: -500,
  description: 'сверка наличных',
  occurredAt: '2026-09-01T12:00:00.000Z',
  accountId: 'a1',
} as never

describe('ReconcileAccountForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mountForm(target: AccountWithBalance = account) {
    const accounts = createMockAccountRepository()
    accounts.getAll.mockResolvedValue([target])
    const transactions = createMockTransactionRepository()
    transactions.create.mockResolvedValue(createdAdjustment)

    const wrapper = mountWithProviders(ReconcileAccountForm, {
      props: { account: target } as never,
      repositories: { accounts, transactions },
      global: { stubs: { DialogClose: true } },
    })
    return { wrapper, transactions }
  }

  it('prefills the target with the current balance and shows the zero-delta state', async () => {
    const { wrapper, transactions } = mountForm()
    await flushPromises()

    // 120.00 RUB prefilled: delta 0 -> no-op state, submit disabled.
    const preview = wrapper.find('[data-testid="reconcile-delta-preview"]')
    expect(preview.exists()).toBe(true)
    expect(wrapper.find('[data-testid="reconcile-submit"]').attributes('disabled')).toBeDefined()

    await submit(wrapper)
    await nextTick()
    expect(transactions.create).not.toHaveBeenCalled()
  })

  it('creates a negative adjustment with the computed delta and note', async () => {
    const { wrapper, transactions } = mountForm()
    await flushPromises()

    wrapper.findComponent(AmountField).vm.$emit('update:modelValue', 115)
    await nextTick()

    const preview = wrapper.find('[data-testid="reconcile-delta-preview"]')
    expect(preview.text()).toContain('5') // |120 - 115| = 5 removed
    expect(wrapper.find('[data-testid="reconcile-submit"]').attributes('disabled')).toBeUndefined()

    await wrapper.find('input#reconcile-note').setValue('сверка наличных')
    await submit(wrapper)

    await vi.waitFor(() => expect(transactions.create).toHaveBeenCalledTimes(1))
    expect(transactions.create).toHaveBeenCalledWith({
      type: 'adjustment',
      amount: -500,
      description: 'сверка наличных',
      occurredAt: expect.any(String),
      accountId: 'a1',
    })
  })

  it('creates a positive adjustment when the actual balance is higher', async () => {
    const { wrapper, transactions } = mountForm()
    await flushPromises()

    wrapper.findComponent(AmountField).vm.$emit('update:modelValue', 135)
    await nextTick()
    await submit(wrapper)

    await vi.waitFor(() => expect(transactions.create).toHaveBeenCalledTimes(1))
    expect(transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'adjustment', amount: 1500 }),
    )
  })
})

async function submit(wrapper: VueWrapper) {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}
