import { describe, it, expect } from 'vitest'
import TransactionsFiltersSheet from './TransactionsFiltersSheet.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('TransactionsFiltersSheet', () => {
  it('mounts and renders trigger button', () => {
    const wrapper = mountWithProviders(TransactionsFiltersSheet, { repositories: {} })
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('mounts Sheet component', () => {
    const wrapper = mountWithProviders(TransactionsFiltersSheet, { repositories: {} })
    expect(wrapper.findComponent({ name: 'Sheet' }).exists()).toBe(true)
  })
})
