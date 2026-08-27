import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

import { mountWithProviders } from './helpers/mount-with-providers'
import App from '../App.vue'

// jsdom has no Worker: stub the local-db bridge as ready so AppShell renders
// its content (nav + outlet) around the stubbed controller. The boot state
// must be a real ref - templates only auto-unwrap refs.
vi.mock('@/shared/lib/local-db/local-db', () => ({
  getLocalDbApi: () => new Promise(() => {}),
  useLocalDbBootState: () => ref('ready'),
  onLocalDataChanged: () => () => {},
}))

describe('App', () => {
  it('renders AppShell with nav', () => {
    const wrapper = mountWithProviders(App, { repositories: {} })
    expect(wrapper.find('nav').exists()).toBe(true)
  })
})
