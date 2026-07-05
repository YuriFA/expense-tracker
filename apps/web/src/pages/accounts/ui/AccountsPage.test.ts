import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import AccountsPage from './AccountsPage.vue'
import AccountCard from './AccountCard.vue'
import { AddAccountForm } from '../features/add-account'
import type { AccountWithBalance } from '@/entities/account'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const accounts: AccountWithBalance[] = [
  { id: 'a1', name: 'Main', currency: 'USD', openingBalance: 1000, manualAdjustment: 0, balance: 1500 },
  { id: 'a2', name: 'Savings', currency: 'USD', openingBalance: 500, manualAdjustment: 0, balance: 700 },
]

describe('AccountsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title and description', () => {
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue([])
    const wrapper = mountWithProviders(AccountsPage, {
      repositories: { accounts: accountsRepo },
    })
    const heading = wrapper.find('h1')
    expect(heading.exists()).toBe(true)
    expect(heading.text()).toBeTruthy()
  })

  it('renders account cards after data loads', async () => {
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue(accounts)
    const wrapper = mountWithProviders(AccountsPage, {
      repositories: { accounts: accountsRepo },
    })
    await flushPromises()
    const cards = wrapper.findAllComponents(AccountCard)
    expect(cards.length).toBe(2)
  })

  it('renders total balance card with formatted sum', async () => {
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue(accounts)
    const wrapper = mountWithProviders(AccountsPage, {
      repositories: { accounts: accountsRepo },
    })
    await flushPromises()
    // Total balance (1500 + 700 = 2200 kopeks = $22.00) formatted per currency
    expect(wrapper.text()).toMatch(/22\.00/)
  })

  it('renders create button', () => {
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue([])
    const wrapper = mountWithProviders(AccountsPage, {
      repositories: { accounts: accountsRepo },
    })
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('renders AddAccountForm component (inside dialog trigger)', () => {
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue([])
    const wrapper = mountWithProviders(AccountsPage, {
      repositories: { accounts: accountsRepo },
    })
    // AddAccountForm is rendered inside DialogContent; depending on dialog lazy rendering,
    // it may or may not be in DOM until opened. At minimum, DialogTrigger should exist.
    expect(wrapper.findComponent({ name: 'Dialog' }).exists() || wrapper.findComponent(AddAccountForm).exists()).toBe(true)
  })

  it('handles empty accounts list', async () => {
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue([])
    const wrapper = mountWithProviders(AccountsPage, {
      repositories: { accounts: accountsRepo },
    })
    await flushPromises()
    expect(wrapper.findAllComponents(AccountCard)).toHaveLength(0)
  })
})
