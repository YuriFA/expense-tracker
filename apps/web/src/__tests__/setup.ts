import { afterEach, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import i18n from '@/shared/i18n'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  // Component tests assert English copy; the product default locale is RU
  // (capability web-locales) - locale default/switching has dedicated tests.
  i18n.global.locale.value = 'en'
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})
