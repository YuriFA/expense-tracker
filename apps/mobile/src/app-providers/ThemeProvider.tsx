import { useColorScheme, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { PropsWithChildren } from 'react'
import { ThemeContext, makeThemeValue } from '@shared/ui/theme'
import { useSettingsStore } from '@shared/store/use-settings-store'
import { cn } from '@shared/lib/cn'
import type { ResolvedTheme } from '@shared/config/settings'

/**
 * Resolves the user's theme preference (`'system' | 'light' | 'dark'`) against
 * the OS color scheme and exposes the token map via {@link ThemeContext}. The
 * dark theme mirrors light by lightness, per the design system. Also drives the
 * `StatusBar` style so it stays legible in either mode.
 *
 * Theme reconciliation with NativeWind v4 (class-based dark mode):
 *
 *  - The persisted preference lives in the MMKV-backed settings store, which is
 *    read into the store's *initial* state synchronously (no async effect) - so
 *    `resolved` is correct on the very first render. This preserves the
 *    no-cold-start-theme-flash invariant exactly as before.
 *  - `resolved` is applied two ways, both synchronous on first paint:
 *      1. The JS token map (`useTokens()`) is filled from `resolved` - the path
 *         the inline-styled components (and the Home hero amount) already use.
 *      2. A `dark` class is painted on the root wrapper View, which flips the
 *         NativeWind CSS custom properties (rgba values) for the
 *         react-native-reusables-backed primitives.
 *  - NativeWind's own `useColorScheme()` is deliberately NOT the source of
 *    truth: its observable can lag a frame for an explicit (non-system)
 *    preference, which would reintroduce the flash. This wrapper avoids that.
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const theme = useSettingsStore((state) => state.theme)
  const systemScheme = useColorScheme()

  const resolved: ResolvedTheme = theme === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : theme
  const value = makeThemeValue(resolved)

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      <View className={cn('flex-1 bg-background', resolved === 'dark' && 'dark')}>{children}</View>
    </ThemeContext.Provider>
  )
}
