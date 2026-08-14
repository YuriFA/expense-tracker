import '../../global.css'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ThemeProvider } from '@/shared/config/theme'

/**
 * Root layout: app-wide providers and the top-level navigator.
 *
 * Provider wiring (i18n, session repository DI, unauthorized interceptor) will
 * land here as each piece is built; for now it sets up the native primitives
 * (safe areas, gesture handler, status bar) every screen depends on.
 *
 * TODO(auth): add the session gate - render `(auth)` for unauthenticated users
 * and `(tabs)` once authenticated, mirroring the web router guard at
 * apps/web/src/app/router. Until the session entity exists, both groups stay
 * reachable via the Stack.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <BottomSheetModalProvider>
          <StatusBar style="auto" />
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            {/* Placeholder destinations for the Home quick actions. */}
            <Stack.Screen name="income" options={{ headerShown: false }} />
            <Stack.Screen name="goals" options={{ headerShown: false }} />
          </Stack>
        </BottomSheetModalProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
