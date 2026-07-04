import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import AccountSelect from './AccountSelect.vue'
import type { AccountWithBalance } from '../model/types'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const accounts: AccountWithBalance[] = [
  { id: 'a1', name: 'Main', openingBalance: 1000, manualAdjustment: 0, balance: 1000 },
  { id: 'a2', name: 'Savings', openingBalance: 500, manualAdjustment: 0, balance: 500 },
]

const baseProps = {
  label: 'Account',
  placeholder: 'Select account',
  inputId: 'account-id',
}

function mountField(props: Record<string, unknown> = {}, repositories: Record<string, unknown> = {}) {
  const Wrapper = defineComponent({
    setup() {
      return () => h(AccountSelect, { ...baseProps, ...props })
    },
  })
  return mountWithProviders(Wrapper, { repositories })
}

describe('AccountSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders select trigger with given inputId', async () => {
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue(accounts)
    const wrapper = mountField({}, { accounts: accountsRepo })
    await flushPromises()
    expect(wrapper.find('button#account-id').exists()).toBe(true)
  })

  it('renders FieldLabel', async () => {
    const wrapper = mountField()
    await flushPromises()
    expect(wrapper.find('label[for="account-id"]').exists()).toBe(true)
  })

  it('renders Select component', async () => {
    const wrapper = mountField()
    await flushPromises()
    expect(wrapper.findComponent({ name: 'Select' }).exists()).toBe(true)
  })

  it('reflects modelValue in Select', async () => {
    const wrapper = mountField({ modelValue: 'a1' })
    await flushPromises()
    expect(wrapper.findComponent({ name: 'Select' }).props('modelValue')).toBe('a1')
  })
})
