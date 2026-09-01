import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import TransactionsFiltersSheet from './TransactionsFiltersSheet.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'
import { DESKTOP_PRESENTATION_KEY } from '@/shared/lib/presentation'

describe('TransactionsFiltersSheet', () => {
  it('mounts and renders trigger button', () => {
    const wrapper = mountWithProviders(TransactionsFiltersSheet, { repositories: {} })
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('mounts the desktop sheet when pinned to desktop presentation', () => {
    const wrapper = mountWithProviders(TransactionsFiltersSheet, {
      repositories: {},
      global: {
        provide: {
          [DESKTOP_PRESENTATION_KEY]: ref(true),
        },
      },
    })
    expect(wrapper.findComponent({ name: 'Sheet' }).exists()).toBe(true)
  })

  it('mounts the mobile drawer by default in jsdom', () => {
    const wrapper = mountWithProviders(TransactionsFiltersSheet, { repositories: {} })
    expect(wrapper.findComponent({ name: 'Drawer' }).exists()).toBe(true)
  })
})
