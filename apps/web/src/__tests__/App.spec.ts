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
  it('renders AppShell with the navigation shell', () => {
    const wrapper = mountWithProviders(App, { repositories: {} })
    // jsdom never matches the desktop media query, so the shell renders the
    // mobile top bar; the desktop sidebar mounts only on real desktops.
    expect(wrapper.find('header').exists()).toBe(true)
  })
})
