import { describe, it, expect } from 'vitest'
import TransactionsFilters from './TransactionsFilters.vue'
import TransactionTypeField from './TransactionTypeField.vue'
import TransactionAccountField from './TransactionAccountField.vue'
import TransactionCategoriesField from './TransactionCategoriesField.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('TransactionsFilters', () => {
  it('renders form element', () => {
    const wrapper = mountWithProviders(TransactionsFilters, { repositories: {} })
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('renders all filter field components', () => {
    const wrapper = mountWithProviders(TransactionsFilters, { repositories: {} })
    expect(wrapper.findComponent(TransactionTypeField).exists()).toBe(true)
    expect(wrapper.findComponent(TransactionAccountField).exists()).toBe(true)
    expect(wrapper.findComponent(TransactionCategoriesField).exists()).toBe(true)
  })

  it('renders apply and reset buttons', () => {
    const wrapper = mountWithProviders(TransactionsFilters, { repositories: {} })
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })
})
