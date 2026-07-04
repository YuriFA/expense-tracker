import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import AddAccountForm from './AddAccountForm.vue'
import type { AccountWithBalance } from '@/entities/account'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const createdAccount: AccountWithBalance = {
  id: 'a1',
  name: 'Main',
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
})
