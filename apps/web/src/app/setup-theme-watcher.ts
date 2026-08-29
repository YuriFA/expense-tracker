import { watch } from 'vue'
import { useSettingsStore } from '@/shared/store/use-settings-store'
import { applyTheme } from './theme'

/**
 * Owns the theme -> DOM bridge (capability `web-theme`): applies the
 * persisted theme before the first paint (`{ immediate: true }` rehydrates
 * the stored choice) and re-applies it on every settings change - the same
 * app-side watcher pattern as the i18n locale sync, so pages never import
 * the app layer.
 */
export const setupThemeWatcher = () => {
  const settings = useSettingsStore()

  watch(
    () => settings.theme,
    (value) => {
      applyTheme(value)
    },
    { immediate: true },
  )
}
