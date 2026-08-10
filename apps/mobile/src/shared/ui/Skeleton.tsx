import { View, StyleSheet, type DimensionValue, type ViewStyle } from 'react-native'
import { useTokens } from './theme'

interface SkeletonProps {
  /** Rounded shape; pass a number to size a circle (avatar). */
  radius?: number
  circle?: boolean
  width?: DimensionValue
  height?: number
  style?: ViewStyle
}

/**
 * Skeleton placeholder - the loading vocabulary (design section 9). Content
 * areas use skeletons, never centered spinners. The muted token gives the
 * "shimmer track" tone; animate the wrapper if Reduce Motion is off.
 */
export function Skeleton({ radius = 8, circle = false, width = '100%', height = 16, style }: SkeletonProps) {
  const tokens = useTokens()
  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: tokens.muted,
          borderRadius: circle ? (typeof width === 'number' ? width / 2 : height / 2) : radius,
        },
        style,
      ]}
    />
  )
}

/** A skeleton line for placeholder text rows. */
export function SkeletonLine({ width = '100%' }: { width?: DimensionValue }) {
  return <Skeleton width={width} height={14} style={{ marginBottom: 6 }} />
}

export const skeletonStyles = StyleSheet.create({
  block: { padding: 16, gap: 12 },
})
