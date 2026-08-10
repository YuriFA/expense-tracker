import { Pressable, View, StyleSheet, type ViewStyle } from 'react-native'
import { type PropsWithChildren } from 'react'
import { useTokens } from './theme'
import { Text } from './Text'

interface ChipProps extends PropsWithChildren {
  selected?: boolean
  onPress?: () => void
  /** Icon node rendered before the label (category glyph, etc.). */
  leading?: React.ReactNode
  style?: ViewStyle
}

/**
 * Chip - account pick, active filters. Selectable; the selected state takes the
 * ink fill + inverse label, unselected is bordered. Touch target >= 44pt.
 */
export function Chip({ selected = false, onPress, leading, style, children }: ChipProps) {
  const tokens = useTokens()

  if (!onPress) {
    return (
      <View
        style={[
          styles.base,
          {
            backgroundColor: selected ? tokens.ink : 'transparent',
            borderColor: selected ? 'transparent' : tokens.border,
          },
          style,
        ]}
      >
        {leading}
        <Text size="label" weight={500} tone={selected ? 'inverse' : 'default'}>
          {children}
        </Text>
      </View>
    )
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: selected ? tokens.ink : 'transparent',
          borderColor: selected ? 'transparent' : tokens.border,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {leading}
      <Text size="label" weight={500} tone={selected ? 'inverse' : 'default'}>
        {children}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
})
