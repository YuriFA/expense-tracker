import { describe, it, expect } from 'vitest'
import RecentTransactionsCard from './RecentTransactionsCard.vue'
import { RecentTransactions } from '@/features/transactions-list'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('RecentTransactionsCard', () => {
  it('renders RecentTransactions component inside', () => {
    const wrapper = mountWithProviders(RecentTransactionsCard, { repositories: {} })
    expect(wrapper.findComponent(RecentTransactions).exists()).toBe(true)
  })
})
