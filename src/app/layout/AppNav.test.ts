import { describe, it, expect } from 'vitest'
import AppNav from './AppNav.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('AppNav', () => {
  it('renders navigation links from i18n', () => {
    const wrapper = mountWithProviders(AppNav)
    const links = wrapper.findAll('a')
    expect(links.length).toBeGreaterThanOrEqual(4)
  })

  it('renders RouterLink components with hrefs', () => {
    const wrapper = mountWithProviders(AppNav)
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/')
    expect(hrefs).toContain('/transactions')
    expect(hrefs).toContain('/accounts')
    expect(hrefs).toContain('/settings')
  })
})
