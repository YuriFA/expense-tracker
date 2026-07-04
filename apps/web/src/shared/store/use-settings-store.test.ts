import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from './use-settings-store'

describe('useSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default values when localStorage is empty', () => {
    const store = useSettingsStore()
    const { locale, currency, theme } = storeToRefs(store)
    expect(locale.value).toBeTruthy()
    expect(currency.value).toBeTruthy()
    expect(theme.value).toBeTruthy()
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

  it('updates locale reactively', async () => {
    const store = useSettingsStore()
    const { locale } = storeToRefs(store)
    const original = locale.value
    store.locale = original === 'ru' ? 'en' : 'ru'
    await nextTick()
    expect(locale.value).not.toBe(original)
  })
})
