import { Text, View, type ViewProps } from 'react-native'

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
export function ScreenPlaceholder({ title, hint, ...rest }: ScreenPlaceholderProps) {
  return (
    <View className="flex-1 items-center justify-center gap-2 p-6" {...rest}>
      <Text className="text-xl font-semibold text-foreground">{title}</Text>
      {hint ? <Text className="text-sm text-center text-muted-foreground">{hint}</Text> : null}
    </View>
  )
}
