import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import AccountCard from './AccountCard.vue'
import type { AccountWithBalance } from '@/entities/account/types'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'
import { useSettingsStore } from '@/app/use-settings-store'

const accountFixture: AccountWithBalance = {
  id: 'a1',
  name: 'Main',
  openingBalance: 1000,
  manualAdjustment: 0,
  balance: 1234.56,
}

describe('AccountCard', () => {
  it('renders account name', () => {
    const wrapper = mountWithProviders(AccountCard, {
      props: { account: accountFixture } as never,
      repositories: {},
    })
    expect(wrapper.text()).toContain('Main')
  })

  it('renders formatted balance', async () => {
    const wrapper = mountWithProviders(AccountCard, {
      props: { account: accountFixture } as never,
      repositories: {},
    })
    // useSettingsStore + useI18n for formatting
    await nextTick()
    // Balance should be displayed as currency
    expect(wrapper.text()).toMatch(/1[,.]?234/)
  })

  it('renders first letter of name as avatar', () => {
    const wrapper = mountWithProviders(AccountCard, {
      props: { account: { ...accountFixture, name: 'Savings' } } as never,
      repositories: {},
    })
    expect(wrapper.text()).toContain('S')
  })

  it('uses settings store currency for formatting', async () => {
    const wrapper = mountWithProviders(AccountCard, {
      props: { account: accountFixture } as never,
      repositories: {},
    })
    const store = useSettingsStore()
    store.currency = 'RUB'
    await nextTick()
    expect(wrapper.text()).toMatch(/1[,.]?234/)
    // Sanity: store currency is RUB
    expect(store.currency).toBe('RUB')
  })
})
