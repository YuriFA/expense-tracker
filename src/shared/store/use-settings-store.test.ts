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
    expect(store.currency).toBe(DEFAULT_SETTINGS.currency)
    expect(store.theme).toBe(DEFAULT_SETTINGS.theme)
  })

  it('persists values to localStorage on change', async () => {
    const store = useSettingsStore()
    store.currency = 'RUB'
    await nextTick()
    const stored = localStorage.getItem('BudgetTracker:currency')
    expect(stored).toBe('RUB')
  })

  it('reads initial values from localStorage when present', () => {
    localStorage.setItem('BudgetTracker:currency', 'EUR')
    const store = useSettingsStore()
    expect(store.currency).toBe('EUR')
  })
})
