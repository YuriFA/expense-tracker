import { describe, it, expect } from 'vitest'
import DashboardPage from './DashboardPage.vue'
import NetWorthCard from './NetWorthCard.vue'
import RecentTransactionsCard from './RecentTransactionsCard.vue'
import AddTransactionCard from './AddTransactionCard.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('DashboardPage', () => {
  it('renders all main dashboard widgets', () => {
    const wrapper = mountWithProviders(DashboardPage, { repositories: {} })
    expect(wrapper.findComponent(NetWorthCard).exists()).toBe(true)
    expect(wrapper.findComponent(RecentTransactionsCard).exists()).toBe(true)
    expect(wrapper.findComponent(AddTransactionCard).exists()).toBe(true)
  })
})
