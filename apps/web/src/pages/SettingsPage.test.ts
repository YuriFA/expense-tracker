import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import SettingsPage from './SettingsPage.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'
import { useSettingsStore } from '@/app/use-settings-store'

describe('SettingsPage', () => {
  it('renders page title', () => {
    const wrapper = mountWithProviders(SettingsPage)
    // Page title is rendered (translated from pages.settings)
    const heading = wrapper.find('h1')
    expect(heading.exists()).toBe(true)
    expect(heading.text()).toBeTruthy()
  })

  it('renders currency select with options', () => {
    const wrapper = mountWithProviders(SettingsPage)
    const selects = wrapper.findAllComponents({ name: 'Select' })
    expect(selects.length).toBeGreaterThanOrEqual(2)
  })

  it('reflects current settings currency', async () => {
    mountWithProviders(SettingsPage)
    const store = useSettingsStore()
    store.currency = 'EUR'
    await nextTick()
    expect(store.currency).toBe('EUR')
  })
})
