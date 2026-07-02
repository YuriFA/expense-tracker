import { describe, it, expect } from 'vitest'
import AppShell from './AppShell.vue'
import AppNav from './AppNav.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('AppShell', () => {
  it('renders AppNav component', () => {
    const wrapper = mountWithProviders(AppShell)
    expect(wrapper.findComponent(AppNav).exists()).toBe(true)
  })

  it('renders main element for content', () => {
    const wrapper = mountWithProviders(AppShell)
    expect(wrapper.find('main').exists()).toBe(true)
  })
})
