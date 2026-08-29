import { describe, it, expect, vi, afterEach } from 'vitest'
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
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders AppShell with the navigation shell', () => {
    // BProgress arms a delayed start() timer on mount and its unmount hook
    // never clears it; on real timers the callback can fire after the jsdom
    // teardown and crash the run ("document is not defined"). Pinning the
    // clock keeps the timer inside the test's lifetime.
    vi.useFakeTimers()
    const wrapper = mountWithProviders(App, { repositories: {} })
    // jsdom never matches the desktop media query, so the shell renders the
    // mobile top bar; the desktop sidebar mounts only on real desktops.
    expect(wrapper.find('header').exists()).toBe(true)
    wrapper.unmount()
  })
})
