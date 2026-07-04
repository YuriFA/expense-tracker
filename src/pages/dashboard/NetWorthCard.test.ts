import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import NetWorthCard from './NetWorthCard.vue'
import type { AccountWithBalance } from '@/entities/account'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const accounts: AccountWithBalance[] = [
  { id: 'a1', name: 'Main', openingBalance: 1000, manualAdjustment: 0, balance: 1500 },
  { id: 'a2', name: 'Savings', openingBalance: 500, manualAdjustment: 0, balance: 700 },
]

describe('NetWorthCard', () => {
  it('renders total balance sum across accounts', async () => {
    const repo = createMockAccountRepository()
    repo.getAll.mockResolvedValue(accounts)
    const wrapper = mountWithProviders(NetWorthCard, {
      repositories: { accounts: repo },
    })
    await flushPromises()
    // Total balance (1500 + 700 = 2200) should be rendered
    expect(wrapper.text()).toMatch(/2[,.]?200/)
  })

  it('renders each account name with link', async () => {
    const repo = createMockAccountRepository()
    repo.getAll.mockResolvedValue(accounts)
    const wrapper = mountWithProviders(NetWorthCard, {
      repositories: { accounts: repo },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Main')
    expect(wrapper.text()).toContain('Savings')
  })

  it('renders RouterLink with transactions query for each account', async () => {
    const repo = createMockAccountRepository()
    repo.getAll.mockResolvedValue(accounts)
    const wrapper = mountWithProviders(NetWorthCard, {
      repositories: { accounts: repo },
    })
    await flushPromises()
    const links = wrapper.findAll('a')
    expect(links.length).toBeGreaterThanOrEqual(2)
    // Each link should have an href containing accountId
    const hrefs = links.map((l) => l.attributes('href'))
    expect(hrefs.some((h) => h?.includes('accountId=a1'))).toBe(true)
    expect(hrefs.some((h) => h?.includes('accountId=a2'))).toBe(true)
  })

  it('handles empty accounts list', async () => {
    const repo = createMockAccountRepository()
    repo.getAll.mockResolvedValue([])
    const wrapper = mountWithProviders(NetWorthCard, {
      repositories: { accounts: repo },
    })
    await flushPromises()
    // Should still render without errors
    expect(wrapper.find('a').exists()).toBe(false)
  })
})
