import { create } from 'zustand'
import i18next from 'i18next'
import { STORAGE_KEYS } from '@shared/config/storage-keys'
import { DEFAULT_SETTINGS, type Settings, type ThemePreference } from '@shared/config/settings'
import { settingsStorage } from '@shared/services/storage'

interface SettingsState extends Settings {
  /** Load persisted settings once at boot; also syncs i18next locale. */
  hydrate: () => void
  setLocale: (locale: Settings['locale']) => void
  setCurrency: (currency: Settings['currency']) => void
  setTheme: (theme: ThemePreference) => void
}

function persist(settings: Settings): void {
  settingsStorage.set(STORAGE_KEYS.settings, settings)
}

function readPersisted(): Settings {
  const stored = settingsStorage.get<Settings>(STORAGE_KEYS.settings)
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) }
}

/**
 * Global settings store. Every mutation persists immediately and - for locale -
 * propagates to the i18next instance so language change applies at runtime
 * without restart (design.md section 6/10).
 *
 * The persisted values are read into the *initial* state (not via an async
 * effect) because MMKV is synchronous: this means the correct locale + theme +
 * currency apply on the very first paint (no cold-start theme/locale flash) and
 * are already in place when the SQLite seed runs on first launch. `hydrate()`
 * only syncs the i18next instance (initialized separately) to that locale.
 */
export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...readPersisted(),

  hydrate: () => {
    // State is already seeded synchronously at creation; just keep i18next in
    // sync with the persisted locale (initI18n runs in the same boot effect).
    void i18next.changeLanguage(get().locale)
  },

  setLocale: (locale) => {
    set({ locale })
    persist(get())
    void i18next.changeLanguage(locale)
  },

  setCurrency: (currency) => {
    set({ currency })
    persist(get())
  },

  setTheme: (theme) => {
    set({ theme })
    persist(get())
  },
}))
