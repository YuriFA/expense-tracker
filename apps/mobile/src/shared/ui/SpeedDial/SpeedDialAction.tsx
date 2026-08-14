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
 * One row of an expanded SpeedDial (`[label?] (icon)`); the whole row is a
 * single Pressable. Its appear/disappear is derived from the shared `progress`
 * value with a per-index stagger, so rapid open/close can't leave it hung (no
 * per-action timer). The React `open` prop only gates pointer events / a11y
 * while the shared value drives the visuals.
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
