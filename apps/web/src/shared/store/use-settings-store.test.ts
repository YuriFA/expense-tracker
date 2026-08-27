import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useSettingsStore } from './use-settings-store'
import { DEFAULT_SETTINGS } from '@/shared/config/settings'

describe('useSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default values when localStorage is empty', () => {
    const store = useSettingsStore()
    expect(store.locale).toBe(DEFAULT_SETTINGS.locale)
    expect(store.theme).toBe(DEFAULT_SETTINGS.theme)
  })

  it('defaults the locale to Russian (product default, web-locales)', () => {
    const store = useSettingsStore()
    expect(store.locale).toBe('ru')
  })

  it('persists the chosen locale to localStorage on change', async () => {
    const store = useSettingsStore()
    store.locale = 'en'
    await nextTick()
    expect(localStorage.getItem('BudgetTracker:locale')).toBe('en')
  })

  it('persists the theme to localStorage on change', async () => {
    const store = useSettingsStore()
    store.theme = 'dark'
    await nextTick()
    const stored = localStorage.getItem('BudgetTracker:theme')
    expect(stored).toBe('dark')
  })

  it('reads initial locale from localStorage when present', () => {
    localStorage.setItem('BudgetTracker:locale', 'en')
    const store = useSettingsStore()
    expect(store.locale).toBe('en')
  })

  // currency-rub-only: the currency field left the store; a stale key left
  // by an older install is ignored, not cleaned up.
  it('ignores a stale currency key in localStorage without removing it', () => {
    localStorage.setItem('BudgetTracker:currency', 'EUR')
    const store = useSettingsStore()
    expect(store.locale).toBe(DEFAULT_SETTINGS.locale)
    expect(localStorage.getItem('BudgetTracker:currency')).toBe('EUR')
  })
})
