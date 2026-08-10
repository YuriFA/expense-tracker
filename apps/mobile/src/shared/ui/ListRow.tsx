import { Pressable, View, StyleSheet, type ViewStyle } from 'react-native'
import { type PropsWithChildren, type ReactNode } from 'react'
import { useTokens } from './theme'

interface ListRowProps {
  /** Leading slot (avatar / category icon). */
  leading?: ReactNode
  /** Primary content. */
  children: ReactNode
  /** Trailing slot (amount / chevron / action). */
  trailing?: ReactNode
  onPress?: () => void
  /** Hide the bottom hairline divider (last item). */
  divider?: boolean
  style?: ViewStyle
}

/**
 * List row - transaction / account items with dividers. One row vocabulary
 * across the product: leading + content + trailing, separated by a hairline.
 * Touch target >= 56pt for comfortable thumb use.
 */
export function ListRow({
  leading,
  children,
  trailing,
  onPress,
  divider = true,
  style,
}: ListRowProps) {
  const tokens = useTokens()

  const inner = (
    <View
      style={[
        styles.row,
        divider && { borderBottomColor: tokens.border, borderBottomWidth: StyleSheet.hairlineWidth },
        style,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={{ flex: 1 }}>{children}</View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  )

  if (!onPress) {
    return inner
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
    >
      {inner}
    </Pressable>
  )
}

// Convenience container for a stack of ListRows aligned to the surface card.
export function ListGroup({ children }: PropsWithChildren) {
  return <View>{children}</View>
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leading: {
    marginRight: 12,
  },
  trailing: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
})
