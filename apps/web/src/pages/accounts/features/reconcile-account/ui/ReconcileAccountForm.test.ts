import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ReconcileAccountForm from './ReconcileAccountForm.vue'
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

// The form owns its ResponsiveDialog, so the open surface renders through a
// portal: the DOM lives under document.body and is driven at the DOM level.
describe('ReconcileAccountForm', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  function mountForm(target: AccountWithBalance = account) {
    const accounts = createMockAccountRepository()
    accounts.getAll.mockResolvedValue([target])
    const transactions = createMockTransactionRepository()
    transactions.create.mockResolvedValue(createdAdjustment)

    mountWithProviders(ReconcileAccountForm, {
      props: { account: target, open: true } as never,
      repositories: { accounts, transactions },
    })
    return { transactions }
  }

  const preview = () => document.querySelector('[data-testid="reconcile-delta-preview"]')
  const submitButton = () =>
    document.querySelector<HTMLButtonElement>('[data-testid="reconcile-submit"]')

  async function setAmount(value: string) {
    const input = document.querySelector<HTMLInputElement>('[data-slot="amount-input"]')!
    input.dispatchEvent(new FocusEvent('focus'))
    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new FocusEvent('blur'))
    await nextTick()
  }

  async function setNote(value: string) {
    const input = document.querySelector<HTMLInputElement>('input#reconcile-note')!
    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
  }

  async function submit() {
    document
      .querySelector('#reconcile-account-form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
  }

  it('prefills the target with the current balance and shows the zero-delta state', async () => {
    const { transactions } = mountForm()
    await flushPromises()

    // 120.00 RUB prefilled: delta 0 -> no-op state, submit disabled.
    expect(preview()).not.toBeNull()
    expect(submitButton()?.hasAttribute('disabled')).toBe(true)

    await submit()
    expect(transactions.create).not.toHaveBeenCalled()
  })

  it('creates a negative adjustment with the computed delta and note', async () => {
    const { transactions } = mountForm()
    await flushPromises()

    await setAmount('115')

    expect(preview()!.textContent).toContain('5') // |120 - 115| = 5 removed
    expect(submitButton()?.hasAttribute('disabled')).toBe(false)

    await setNote('сверка наличных')
    await submit()

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
    const { transactions } = mountForm()
    await flushPromises()

    await setAmount('135')
    await submit()

    await vi.waitFor(() => expect(transactions.create).toHaveBeenCalledTimes(1))
    expect(transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'adjustment', amount: 1500 }),
    )
  })
})
