import { memo } from "react"
import { Pressable, View } from "react-native"
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated"
import { Text } from "../text"
import {
  ACTION_ICON_SIZE,
  ACTION_TARGET,
  ACTION_TRANSLATE,
  ACTION_SCALE_MIN,
  STAGGER,
  STAGGERED_SEGMENT,
} from "./constants"
import type { SpeedDialActionViewProps } from "./SpeedDial.types"

/**
 * SpeedDialAction - one row of an expanded SpeedDial (`[label?]  (icon)`).
 *
 * The whole row is a single interactive `Pressable` (label + icon are one hit
 * target, per spec section 14). Its appear/disappear (opacity, translateY,
 * scale) is derived from the shared `progress` value with a per-index stagger,
 * so rapid open/close cannot leave it hung - there is no per-action timer. The
 * React `open` prop only gates pointer events / accessibility; the shared value
 * drives the visuals. Internal to SpeedDial; exported for direct unit testing.
 */
export function SpeedDialAction(props: SpeedDialActionViewProps) {
  const { action, index, progress, spacing, position, testID, open } = props
  const isRight = position === "bottom-right"

  const appearStyle = useAnimatedStyle(() => {
    const start = index * STAGGER
    const end = start + STAGGERED_SEGMENT
    const p = interpolate(progress.value, [start, end], [0, 1], Extrapolation.CLAMP)
    return {
      opacity: p,
      transform: [
        { translateY: (1 - p) * ACTION_TRANSLATE },
        { scale: ACTION_SCALE_MIN + (1 - ACTION_SCALE_MIN) * p },
      ],
    }
  })

  const reducedStyle = useAnimatedStyle(() => {
    const start = index * STAGGER
    const end = start + STAGGERED_SEGMENT
    const p = interpolate(progress.value, [start, end], [0, 1], Extrapolation.CLAMP)
    // Reduced motion: opacity only, no translate/scale.
    return { opacity: p, transform: [{ scale: 1 }] }
  })

  const a11yLabel = action.accessibilityLabel ?? action.label ?? action.id
  const isInteractive = open && !action.disabled

  return (
    <Animated.View
      style={[props.reducedMotion ? reducedStyle : appearStyle, { marginBottom: spacing }]}
      // Hidden from accessibility & non-interactive while collapsed.
      pointerEvents={open ? "auto" : "none"}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? "yes" : "no-hide-descendants"}
    >
      <Pressable
        testID={testID}
        onPress={isInteractive ? action.onPress : undefined}
        disabled={!isInteractive}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ disabled: Boolean(action.disabled) }}
        className={`flex-row items-center ${isRight ? "flex-row-reverse" : ""}`}
        style={({ pressed }) => [
          { gap: 8, opacity: action.disabled ? 0.5 : 1 },
          pressed && { opacity: 0.85 },
        ]}
      >
        {/* Icon circle - sized to a >=44pt touch target. */}
        <View className="items-center justify-center rounded-full bg-primary shadow-md">
          <View
            style={{
              width: ACTION_TARGET,
              height: ACTION_TARGET,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: ACTION_ICON_SIZE,
                height: ACTION_ICON_SIZE,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {action.icon}
            </View>
          </View>
        </View>

        {/* Optional label pill - part of the same interactive area. */}
        {action.label ? (
          <View className="rounded-md bg-card px-3 py-1.5 shadow-sm">
            <Text variant="label" className="text-foreground">
              {action.label}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  )
}

export default memo(SpeedDialAction)
