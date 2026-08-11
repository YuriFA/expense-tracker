import { PropsWithChildren, useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { initI18n } from '@shared/lib/i18n'
import { useSettingsStore } from '@shared/store/use-settings-store'
import { QueryProvider } from './QueryProvider'
import { I18nProvider } from './I18nProvider'
import { ThemeProvider } from './ThemeProvider'
import { RepositoryProvider } from './RepositoryProvider'

/**
 * Root provider stack, applied once in `app/_layout.tsx`. Order matters:
 *
 *   Query        -> TanStack Query (data layer)
 *   I18n         -> i18next instance (used by the settings store)
 *   Theme        -> resolved tokens + StatusBar
 *   Repository   -> DI (local SQLite repos; async DB open, gates children)
 *
 * Settings (locale / currency / theme) are hydrated from MMKV on mount so the
 * persisted language + theme apply before the first real screen interaction.
 */
export function AppProviders({ children }: PropsWithChildren) {
  const hydrate = useSettingsStore((state) => state.hydrate)

  useEffect(() => {
    // i18n is initialized by <I18nProvider>; hydrate then syncs its locale.
    initI18n()
    hydrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SafeAreaProvider>
      <QueryProvider>
        <I18nProvider>
          <ThemeProvider>
            <RepositoryProvider>{children}</RepositoryProvider>
          </ThemeProvider>
        </I18nProvider>
      </QueryProvider>
    </SafeAreaProvider>
  )
}
