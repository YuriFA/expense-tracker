import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { Form as VeeForm } from 'vee-validate'
import ToAccountField from './ToAccountField.vue'
import type { AccountWithBalance } from '@/entities/account/types'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const accounts: AccountWithBalance[] = [
  { id: 'a1', name: 'Main', openingBalance: 1000, manualAdjustment: 0, balance: 1000 },
  { id: 'a2', name: 'Savings', openingBalance: 500, manualAdjustment: 0, balance: 500 },
]

function mountInForm() {
  const Wrapper = defineComponent({
    setup() {
      return () => h(VeeForm, { onSubmit: vi.fn() }, () => h(ToAccountField))
    },
  })
  return mountWithProviders(Wrapper, { repositories: {} })
}

describe('ToAccountField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mounts inside Form context', async () => {
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue(accounts)
    const Wrapper = defineComponent({
      setup() {
        return () => h(VeeForm, { onSubmit: vi.fn() }, () => h(ToAccountField))
      },
    })
    const wrapper = mountWithProviders(Wrapper, { repositories: { accounts: accountsRepo } })
    await flushPromises()
    expect(wrapper.find('button#to-account-id').exists()).toBe(true)
  })

  it('renders FieldLabel for to-account', async () => {
    const wrapper = mountInForm()
    await flushPromises()
    expect(wrapper.find('label#to-account-id, button#to-account-id').exists()).toBe(true)
  })
})
