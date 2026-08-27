import i18n from '@/shared/i18n'
import { useQueryCache } from '@pinia/colada'
import { watch } from 'vue'
import { useSettingsStore } from '@/shared/store/use-settings-store'

/**
 * Owns the app-side locale plumbing (capability `web-locales`):
 * - applies the settings locale to the i18n instance immediately on startup
 *   (`{ immediate: true }` rehydrates the persisted choice) and on every
 *   change - switching is instant, no reload;
 * - invalidates locale-dependent queries (localized category names) when the
 *   locale changes.
 */
export const setupI18nLocaleWatcher = () => {
  const queryCache = useQueryCache()
  const settings = useSettingsStore()

  watch(
    () => settings.locale,
    (value) => {
      i18n.global.locale.value = value
    },
    { immediate: true },
  )

  watch(i18n.global.locale, () => {
    queryCache.invalidateQueries({ key: ['categories'] })
  })
}
