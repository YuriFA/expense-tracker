import { describe, it, expect } from 'vitest'
import TransactionsBrowser from './TransactionsBrowser.vue'
import TransactionsActiveFilters from './components/TransactionsActiveFilters.vue'
import TransactionsItemsList from './components/TransactionsItemsList.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('TransactionsBrowser', () => {
  it('renders all child components', () => {
    const wrapper = mountWithProviders(TransactionsBrowser, { repositories: {} })
    expect(wrapper.findComponent(TransactionsActiveFilters).exists()).toBe(true)
    expect(wrapper.findComponent(TransactionsItemsList).exists()).toBe(true)
  })
})
