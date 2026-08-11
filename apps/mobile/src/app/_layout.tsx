import '../../global.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useLoadFonts } from '@shared/lib/fonts'
import { AppProviders } from './providers'

/**
 * Root Expo Router layout. Keeps the native splash visible while Outfit loads,
 * then mounts the provider stack (TanStack Query / i18n / theme / repository
 * DI) and the file-based router. `GestureHandlerRootView` is required for
 * reliable touch handling (swipe gestures, bottom-sheet drags).
 */
SplashScreen.preventAutoHideAsync().catch(() => {
  // Prehydration errors are non-fatal; the app still renders once fonts settle.
})

export default function RootLayout() {
  const [fontsLoaded, fontError] = useLoadFonts()

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) {
    // Outfit still loading - keep showing the native splash.
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AppProviders>
    </GestureHandlerRootView>
  )
}
