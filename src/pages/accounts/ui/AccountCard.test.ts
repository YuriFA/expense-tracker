import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import AccountCard from './AccountCard.vue'
import type { AccountWithBalance } from '@/entities/account'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const accountFixture: AccountWithBalance = {
  id: 'a1',
  name: 'Main',
  currency: 'USD',
  openingBalance: 100000,
  manualAdjustment: 0,
  balance: 123456,
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
    await nextTick()
    // 123456 kopeks = $1,234.56
    expect(wrapper.text()).toMatch(/1[,.]?234/)
  })

  it('renders first letter of name as avatar', () => {
    const wrapper = mountWithProviders(AccountCard, {
      props: { account: { ...accountFixture, name: 'Savings' } } as never,
      repositories: {},
    })
    expect(wrapper.text()).toContain('S')
  })

  it('uses account currency for formatting (independent of settings store)', async () => {
    const wrapper = mountWithProviders(AccountCard, {
      props: { account: { ...accountFixture, currency: 'EUR' } } as never,
      repositories: {},
    })
    await nextTick()
    // Account currency drives formatting; settings store currency is irrelevant
    expect(wrapper.text()).toMatch(/1[,.]?234/)
    // EUR narrowSymbol should appear (€), not USD ($)
    expect(wrapper.text()).toContain('€')
    expect(wrapper.text()).not.toContain('$')
  })
})

