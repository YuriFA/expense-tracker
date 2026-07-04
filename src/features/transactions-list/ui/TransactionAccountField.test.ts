import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import TransactionAccountField from './TransactionAccountField.vue'
import type { AccountWithBalance } from '@/entities/account'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const accounts: AccountWithBalance[] = [
  { id: 'a1', name: 'Main', openingBalance: 1000, manualAdjustment: 0, balance: 1000 },
]

describe('TransactionAccountField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders select trigger', async () => {
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue(accounts)
    const Wrapper = defineComponent({
      setup() {
        return () => h(TransactionAccountField)
      },
    })
    const wrapper = mountWithProviders(Wrapper, { repositories: { accounts: accountsRepo } })
    await flushPromises()
    expect(wrapper.find('button#account-id').exists()).toBe(true)
  })
})
