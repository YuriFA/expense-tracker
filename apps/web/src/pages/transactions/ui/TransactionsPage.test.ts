import { describe, it, expect } from 'vitest'
import TransactionsPage from './TransactionsPage.vue'
import TransactionsBrowser from './TransactionsBrowser.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('TransactionsPage', () => {
  it('renders TransactionsBrowser component', () => {
    const wrapper = mountWithProviders(TransactionsPage, { repositories: {} })
    expect(wrapper.findComponent(TransactionsBrowser).exists()).toBe(true)
  })
})
