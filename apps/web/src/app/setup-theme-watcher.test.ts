import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { APP_NAME } from '@/shared/config/app'
import { useSettingsStore } from '@/shared/store/use-settings-store'
import { setupThemeWatcher } from './setup-theme-watcher'

// The watcher bridges settings onto the DOM through applyTheme, which needs
// a matchMedia stub in jsdom (see theme.test.ts).
vi.stubGlobal('matchMedia', () => ({
  matches: false,
  addEventListener: () => {},
  removeEventListener: () => {},
}))

const isDark = () => document.documentElement.classList.contains('dark')

beforeEach(() => {
  document.documentElement.classList.remove('dark')
})

describe('setupThemeWatcher', () => {
  it('applies the persisted theme before the first paint', () => {
    // useStorage serializes the string union raw (not JSON) - same as the
    // locale key the e2e suites seed.
    localStorage.setItem(`${APP_NAME}:theme`, 'dark')

    setupThemeWatcher()

    expect(isDark()).toBe(true)
  })

  it('re-applies the theme on every settings change', async () => {
    setupThemeWatcher()
    const settings = useSettingsStore()

    settings.theme = 'dark'
    await nextTick()
    expect(isDark()).toBe(true)

    settings.theme = 'light'
    await nextTick()
    expect(isDark()).toBe(false)
  })
})
