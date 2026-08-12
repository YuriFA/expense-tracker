import { StyleSheet, Text, View, type ViewProps } from 'react-native'

interface ScreenPlaceholderProps extends ViewProps {
  /** Screen heading. */
  title: string
  /** Optional supporting line shown under the title. */
  hint?: string
}

/**
 * Temporary centered placeholder used by every screen while the real UI is
 * built out. Demonstrates the `shared/ui` layer being consumed through the
 * `@/` alias and will be removed once screens have real content.
 *
 * Each screen passes a stable lowercase-kebab `testID` (e.g. `screen-dashboard`)
 * via the spread props; the Maestro e2e flows assert on it.
 */
export function ScreenPlaceholder({ title, hint, style, ...rest }: ScreenPlaceholderProps) {
  return (
    <View style={[styles.container, style]} {...rest}>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
})
