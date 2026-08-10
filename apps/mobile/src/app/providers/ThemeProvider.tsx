import { useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { PropsWithChildren } from 'react'
import { ThemeContext, makeThemeValue } from '@shared/ui/theme'
import { useSettingsStore } from '@shared/store/use-settings-store'

/**
 * Resolves the user's theme preference (`'system' | 'light' | 'dark'`) against
 * the OS color scheme and exposes the token map via {@link ThemeContext}. The
 * dark theme mirrors light by lightness, per the design system. Also drives the
 * `StatusBar` style so it stays legible in either mode.
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const theme = useSettingsStore((state) => state.theme)
  const systemScheme = useColorScheme()

  const resolved = theme === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : theme
  const value = makeThemeValue(resolved)

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  )
}
