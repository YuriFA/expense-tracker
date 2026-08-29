import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { applyTheme } from './theme'

// jsdom ships no matchMedia; theme.ts caches the query list on first use,
// so a single controllable stub serves the whole file.
const systemState = { matches: false }
const changeListeners: Array<() => void> = []

beforeAll(() => {
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return systemState.matches
    },
    addEventListener: (_type: string, listener: () => void) => changeListeners.push(listener),
    removeEventListener: () => {},
  }))
})

const isDark = () => document.documentElement.classList.contains('dark')
const emitSystemChange = () => changeListeners.forEach((listener) => listener())

beforeEach(() => {
  document.documentElement.classList.remove('dark')
  systemState.matches = false
})

describe('applyTheme', () => {
  it('toggles the dark root class for the explicit themes', () => {
    applyTheme('dark')
    expect(isDark()).toBe(true)

    applyTheme('light')
    expect(isDark()).toBe(false)
  })

  it('resolves system mode from the current OS preference', () => {
    systemState.matches = true
    applyTheme('system')
    expect(isDark()).toBe(true)

    systemState.matches = false
    applyTheme('system')
    expect(isDark()).toBe(false)
  })

  it('follows live OS preference changes in system mode', () => {
    applyTheme('system')
    expect(isDark()).toBe(false)

    systemState.matches = true
    emitSystemChange()
    expect(isDark()).toBe(true)

    systemState.matches = false
    emitSystemChange()
    expect(isDark()).toBe(false)
  })

  it('ignores OS preference changes in explicit modes', () => {
    applyTheme('light')
    systemState.matches = true
    emitSystemChange()
    expect(isDark()).toBe(false)

    applyTheme('dark')
    systemState.matches = false
    emitSystemChange()
    expect(isDark()).toBe(true)
  })
})
