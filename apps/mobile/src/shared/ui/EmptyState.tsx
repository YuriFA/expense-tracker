import { View, StyleSheet } from 'react-native'
import { type ReactNode } from 'react'
import { useTokens } from './theme'
import { Text } from './Text'
import { Button } from './Button'

interface EmptyStateProps {
  /** Leading glyph (emoji / icon) - the "teach, not say nothing" cue. */
  icon?: ReactNode
  heading: string
  description?: string
  /** Call-to-action button label; omit for purely informational states. */
  actionLabel?: string
  onAction?: () => void
}

/**
 * Empty state (design section 9). An empty list should teach, not say "nothing
 * here": an icon + a short heading + an optional CTA. Rendered centered in the
 * content area (not a toast).
 */
export function EmptyState({ icon, heading, description, actionLabel, onAction }: EmptyStateProps) {
  const tokens = useTokens()
  return (
    <View style={[styles.container, { backgroundColor: tokens.background }]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text size="title" weight={600} style={{ textAlign: 'center' }}>
        {heading}
      </Text>
      {description ? (
        <Text size="body" tone="muted" style={{ textAlign: 'center' }}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="primary" onPress={onAction} style={{ marginTop: 4 }}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  icon: {
    marginBottom: 4,
  },
})
