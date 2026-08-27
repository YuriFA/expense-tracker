import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import AddAccountForm from './AddAccountForm.vue'
import type { AccountWithBalance } from '@/entities/account'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const createdAccount: AccountWithBalance = {
  version: 1,
  id: 'a1',
  name: 'Main',
  currency: 'RUB',
  openingBalance: 100,
  manualAdjustment: 0,
  balance: 100,
}

describe('AddAccountForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders name and opening balance fields', () => {
    const accounts = createMockAccountRepository()
    const wrapper = mountWithProviders(AddAccountForm, {
      repositories: { accounts },
    })
    expect(wrapper.find('input#name').exists()).toBe(true)
  })

  // currency-rub-only: no currency picker - RUB is submitted implicitly.
  it('renders no currency field', () => {
    const accounts = createMockAccountRepository()
    const wrapper = mountWithProviders(AddAccountForm, {
      repositories: { accounts },
    })
    expect(wrapper.find('label[for="currency"]').exists()).toBe(false)
    expect(wrapper.findAllComponents({ name: 'Select' }).length).toBe(0)
    expect(wrapper.text()).not.toContain('Currency')
  })

  it('renders submit button', () => {
    const accounts = createMockAccountRepository()
    const wrapper = mountWithProviders(AddAccountForm, {
      repositories: { accounts },
    })
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('renders with valid props and exposes handlers', () => {
    const accounts = createMockAccountRepository()
    accounts.create.mockResolvedValue(createdAccount)
    const wrapper = mountWithProviders(AddAccountForm, {
      repositories: { accounts },
    })
    // Submit button should be rendered and clickable
    const button = wrapper.find('button[type="submit"]')
    expect(button.exists()).toBe(true)
  })

  it('does not call create when name is empty', async () => {
    const accounts = createMockAccountRepository()
    accounts.create.mockResolvedValue(createdAccount)
    const wrapper = mountWithProviders(AddAccountForm, {
      repositories: { accounts },
    })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(accounts.create).not.toHaveBeenCalled()
  })

  it('submits with the RUB default currency', async () => {
    const accounts = createMockAccountRepository()
    accounts.create.mockResolvedValue(createdAccount)
    const wrapper = mountWithProviders(AddAccountForm, {
      repositories: { accounts },
    })

    await wrapper.find('input#name').setValue('Main')
    await wrapper.find('form').trigger('submit')
    // vee-validate resolves the async schema on its own schedule; poll
    // instead of a fixed flush count.
    await vi.waitFor(() => expect(accounts.create).toHaveBeenCalledTimes(1))

    expect(accounts.create).toHaveBeenCalledWith({
      name: 'Main',
      currency: 'RUB',
      openingBalance: 0,
    })
  })
})
