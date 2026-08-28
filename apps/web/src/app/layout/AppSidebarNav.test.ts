import { describe, it, expect } from 'vitest'
import AppSidebarNav from './AppSidebarNav.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('AppSidebarNav', () => {
  it('renders navigation links from i18n', () => {
    const wrapper = mountWithProviders(AppSidebarNav, { props: { footer: false } })
    const links = wrapper.findAll('a')
    expect(links.length).toBeGreaterThanOrEqual(7)
  })

  it('renders RouterLink components with hrefs', () => {
    const wrapper = mountWithProviders(AppSidebarNav, { props: { footer: false } })
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/')
    expect(hrefs).toContain('/transactions')
    expect(hrefs).toContain('/analytics')
    expect(hrefs).toContain('/debts')
    expect(hrefs).toContain('/plans')
    expect(hrefs).toContain('/accounts')
    expect(hrefs).toContain('/settings')
  })
})
