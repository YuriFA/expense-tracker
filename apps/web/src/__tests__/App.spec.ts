import { describe, it, expect } from 'vitest'

import { mountWithProviders } from './helpers/mount-with-providers'
import App from '../App.vue'

describe('App', () => {
  it('renders AppShell with nav', () => {
    const wrapper = mountWithProviders(App, { repositories: {} })
    expect(wrapper.find('nav').exists()).toBe(true)
  })
})
