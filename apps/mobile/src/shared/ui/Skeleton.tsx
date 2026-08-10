import { useEffect, useRef } from 'react'
import {
  Animated,
  Easing,
  StyleSheet,
  type DimensionValue,
  type ViewStyle,
} from 'react-native'
import { useTokens } from './theme'
import { useReduceMotion } from '@shared/lib/reduce-motion'

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
 * areas use skeletons, never centered spinners. The muted token is the
 * "shimmer track" tone.
 *
 * A gentle opacity pulse conveys "loading" as state (design section 4: motion
 * as a state signal). Reduce Motion users get a static block instead of the
 * pulse (design section 11).
 */
export function Skeleton({ radius = 8, circle = false, width = '100%', height = 16, style }: SkeletonProps) {
  const tokens = useTokens()
  const reduceMotion = useReduceMotion()
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (reduceMotion) {
      opacity.stopAnimation()
      opacity.setValue(1)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [reduceMotion, opacity])

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width,
          height,
          opacity,
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

const styles = StyleSheet.create({
  base: {},
})
