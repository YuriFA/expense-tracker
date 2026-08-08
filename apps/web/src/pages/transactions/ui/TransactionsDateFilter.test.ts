import { describe, it, expect } from 'vitest'
import TransactionsDateFilter from './TransactionsDateFilter.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('TransactionsDateFilter', () => {
  it('mounts and renders trigger button', () => {
    const wrapper = mountWithProviders(TransactionsDateFilter, { repositories: {} })
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('renders CalendarIcon svg', () => {
    const wrapper = mountWithProviders(TransactionsDateFilter, { repositories: {} })
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})
