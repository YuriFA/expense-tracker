import { describe, it, expect } from 'vitest'
import SettingsPage from './SettingsPage.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('SettingsPage', () => {
  it('renders page title', () => {
    const wrapper = mountWithProviders(SettingsPage)
    const heading = wrapper.find('h1')
    expect(heading.exists()).toBe(true)
    expect(heading.text()).toBeTruthy()
  })

  it('renders currency select with options', () => {
    const wrapper = mountWithProviders(SettingsPage)
    const selects = wrapper.findAllComponents({ name: 'Select' })
    expect(selects.length).toBeGreaterThanOrEqual(2)
  })
})
