import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import AccountsCard from './AccountsCard.vue'
import type { AccountWithBalance } from '@/entities/account'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const accounts: AccountWithBalance[] = [
  { id: 'a1', name: 'Main', currency: 'USD', openingBalance: 1000, manualAdjustment: 0, balance: 1500, version: 1 },
  { id: 'a2', name: 'Savings', currency: 'USD', openingBalance: 500, manualAdjustment: 0, balance: 700, version: 1 },
]

describe('AccountsCard', () => {
  it('renders each account with its balance', async () => {
    const repo = createMockAccountRepository()
    repo.getAll.mockResolvedValue(accounts)
    const wrapper = mountWithProviders(AccountsCard, {
      repositories: { accounts: repo },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Main')
    expect(wrapper.text()).toContain('Savings')
    // 1500 + 700 = 2200 kopeks, rendered per account currency
    expect(wrapper.text()).toMatch(/22\.00/)
  })

  it('renders RouterLink with transactions query for each account', async () => {
    const repo = createMockAccountRepository()
    repo.getAll.mockResolvedValue(accounts)
    const wrapper = mountWithProviders(AccountsCard, {
      repositories: { accounts: repo },
    })
    await flushPromises()
    const hrefs = wrapper.findAll('a').map((l) => l.attributes('href'))
    expect(hrefs.some((h) => h?.includes('accountId=a1'))).toBe(true)
    expect(hrefs.some((h) => h?.includes('accountId=a2'))).toBe(true)
  })

  it('renders the total row in the fixed app currency', async () => {
    const repo = createMockAccountRepository()
    repo.getAll.mockResolvedValue(accounts)
    const wrapper = mountWithProviders(AccountsCard, {
      repositories: { accounts: repo },
    })
    await flushPromises()
    // The «Всего» row formats in RUB (currency-rub-only), not in USD.
    expect(wrapper.text()).toContain('₽22.00')
  })

  it('renders the empty state and zero total for empty accounts list', async () => {
    const repo = createMockAccountRepository()
    repo.getAll.mockResolvedValue([])
    const wrapper = mountWithProviders(AccountsCard, {
      repositories: { accounts: repo },
    })
    await flushPromises()
    // Empty-state message instead of account rows; no zero total alongside it.
    expect(wrapper.text()).toContain('No accounts yet')
    const accountLinks = wrapper.findAll('a').filter((a) => a.attributes('href')?.includes('accountId'))
    expect(accountLinks.length).toBe(0)
    expect(wrapper.text()).not.toContain('₽0.00')
  })
})
