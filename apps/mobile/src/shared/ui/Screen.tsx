import { PropsWithChildren } from 'react'
import {
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useTokens } from './theme'

interface ScreenProps extends PropsWithChildren {
  /** Extra padding inside the safe area. */
  padded?: boolean
  /** Make the body scrollable (lists, long forms). */
  scrollable?: boolean
  style?: StyleProp<ViewStyle>
  /** Center the content (used by full-screen empty/error placeholders). */
  centered?: boolean
}

/**
 * The keyboard-aware, safe-area-respecting layout foundation every screen
 * renders into. On iOS the `KeyboardAvoidingView` shifts content so the active
 * field is never covered by the keyboard; on Android RN resizes by default.
 *
 * Safe areas (notch / home indicator / status bar) are always respected via
 * `SafeAreaView`. This is the contract the next task's input screen relies on:
 * drop a form in `<Screen>` and the keyboard + save button behave.
 */
export function Screen({
  children,
  padded = true,
  scrollable = false,
  centered = false,
  style,
}: ScreenProps) {
  const tokens = useTokens()

  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[
        { flexGrow: 1, padding: padded ? 16 : 0 },
        centered && { alignItems: 'center', justifyContent: 'center' },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        { flex: 1, padding: padded ? 16 : 0 },
        centered && { alignItems: 'center', justifyContent: 'center' },
      ]}
    >
      {children}
    </View>
  )

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: tokens.background }, style]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
