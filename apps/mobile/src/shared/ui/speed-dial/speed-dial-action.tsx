import { View } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { Text } from '../text'
import { ACTION_TRANSLATE, ACTION_SCALE_MIN, STAGGER, STAGGERED_SEGMENT } from './constants'
import { Pressable } from '../pressable'
import { cn } from '@/shared/lib/utils'
import { SpeedDialActionItem, SpeedDialPosition } from './speed-dial.types'

interface SpeedDialActionViewProps {
  action: SpeedDialActionItem
  index: number
  progress: SharedValue<number>
  spacing: number
  position: SpeedDialPosition
  testID: string
  /** React open state - gates pointer events / a11y (the shared value drives visuals). */
  open: boolean
}

export function SpeedDialAction({
  action,
  index,
  progress,
  spacing,
  position,
  testID,
  open,
}: SpeedDialActionViewProps) {
  const isRight = position === 'bottom-right'

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

  const a11yLabel = action.accessibilityLabel ?? action.label ?? action.id
  const isInteractive = open && !action.disabled
  const size = action.size ?? 48

  return (
    <Animated.View
      style={[appearStyle, { marginBottom: spacing }]}
      // Hidden from accessibility & non-interactive while collapsed.
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'yes' : 'no-hide-descendants'}
    >
      <Pressable
        testID={testID}
        disabled={!isInteractive}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ disabled: Boolean(action.disabled) }}
        className={cn('flex flex-col items-center gap-2', isRight ? 'flex-row-reverse' : '')}
        onPress={isInteractive ? action.onPress : undefined}
      >
        <View
          className="items-center justify-center rounded-full bg-primary"
          style={{ width: size, height: size }}
        >
          {action.icon}
        </View>

        {action.label ? (
          <Text variant="label" className="text-foreground">
            {action.label}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  )
}
