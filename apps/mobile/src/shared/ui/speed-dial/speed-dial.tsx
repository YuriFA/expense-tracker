import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icon } from '../icon'
import { SpeedDialAction as SpeedDialActionView } from './speed-dial-action'
import type { SpeedDialActionItem } from './speed-dial.types'
import {
  ACTION_SPACING,
  CLOSE_DURATION,
  DEFAULT_BACKDROP_LABEL,
  DEFAULT_BACKDROP_OPACITY,
  DEFAULT_CLOSE_LABEL,
  DEFAULT_EDGE_MARGIN,
  DEFAULT_LABEL,
  DEFAULT_TEST_ID,
  EASE_OUT,
  FAB_ICON_SIZE,
  FAB_SIZE,
  OPEN_DURATION,
} from './constants'
import { Button } from '../button'

const AnimatedView = Animated.View

/**
 * Purpose-built expandable FAB for the single app use case: the centered
 * floating action straddling the bottom tab bar ((tabs)/_layout.tsx). Fully
 * uncontrolled - it opens/closes itself; consumers only supply the actions.
 */
interface SpeedDialProps {
  /** Actions to render, laid out horizontally in a row above the FAB. */
  actions: SpeedDialActionItem[]

  /** FAB accessibility label when closed. @default "More actions" */
  label?: string
  /** FAB accessibility label when open. @default "Close actions" */
  closeLabel?: string

  /**
   * Distance from the viewport's bottom edge to the FAB's bottom edge.
   * Defaults to the safe-area bottom inset + edge margin. When mounting over a
   * bottom tab bar pass the measured tab-bar height (already including its
   * safe-area padding) minus the desired overlap, e.g.
   * `tabBarHeight - FAB_SIZE/2` to straddle the bar's top edge - the component
   * never hardcodes the tab-bar height.
   */
  bottomOffset?: number
}

export function SpeedDial({
  actions,
  label = DEFAULT_LABEL,
  closeLabel = DEFAULT_CLOSE_LABEL,
  bottomOffset,
}: SpeedDialProps) {
  const [open, setOpen] = useState<boolean>(false)

  // --- Single source of animation truth ---
  const progress = useSharedValue(open ? 1 : 0)

  useEffect(() => {
    const target = open ? 1 : 0
    progress.value = withTiming(target, {
      duration: open ? OPEN_DURATION : CLOSE_DURATION,
      easing: EASE_OUT,
    })
  }, [open, progress])

  const insets = useSafeAreaInsets()
  const resolvedBottomOffset = bottomOffset ?? insets.bottom + DEFAULT_EDGE_MARGIN

  const toggle = useCallback(() => {
    setOpen(!open)
  }, [open, setOpen])

  const handleActionPress = useCallback(
    (action: SpeedDialActionItem) => {
      setOpen(false)
      action.onPress()
    },
    [setOpen],
  )

  const fabLabel = open ? closeLabel : label

  return (
    <View testID={DEFAULT_TEST_ID} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Backdrop
        testID={`${DEFAULT_TEST_ID}-backdrop`}
        progress={progress}
        open={open}
        onClose={() => setOpen(false)}
      />

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          bottom: resolvedBottomOffset,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <View pointerEvents="box-none" className="flex flex-row items-center gap-8">
          {actions.map((action, index) => (
            <SpeedDialActionView
              key={action.id}
              action={{ ...action, onPress: () => handleActionPress(action) }}
              index={index}
              progress={progress}
              spacing={ACTION_SPACING}
              testID={`${DEFAULT_TEST_ID}-action-${action.id}`}
              open={open}
            />
          ))}
        </View>

        <Button
          variant="primary"
          testID={`${DEFAULT_TEST_ID}-fab`}
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={fabLabel}
          accessibilityState={{ expanded: open }}
          accessibilityHint="Opens or closes the action menu"
          className="items-center justify-center rounded-full shadow-[0_0_12px_4px_rgba(0,0,0,0.1)]"
          style={{
            width: FAB_SIZE,
            height: FAB_SIZE,
            marginTop: ACTION_SPACING,
          }}
        >
          <FabIcon progress={progress} />
        </Button>
      </View>
    </View>
  )
}

/**
 * Backdrop / scrim. Animated opacity from the shared `progress`. Tappable only
 * when open (closes the menu); invisible and pass-through when closed.
 */
function Backdrop({
  testID,
  progress,
  open,
  onClose,
}: {
  testID: string
  progress: ReturnType<typeof useSharedValue<number>>
  open: boolean
  onClose: () => void
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 1],
      [0, DEFAULT_BACKDROP_OPACITY],
      Extrapolation.CLAMP,
    ),
  }))

  return (
    <Pressable
      testID={testID}
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityRole="button"
      accessibilityLabel={DEFAULT_BACKDROP_LABEL}
      accessibilityHint="Closes the action menu"
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      style={StyleSheet.absoluteFill}
      onPress={onClose}
    >
      <AnimatedView
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, style]}
        className="bg-white"
      />
    </Pressable>
  )
}

/**
 * The FAB icon: an `add` glyph that rotates 0->45deg on open (a `+` rotated
 * 45deg is an `x`).
 */
function FabIcon({ progress }: { progress: ReturnType<typeof useSharedValue<number>> }) {
  const rotateStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(progress.value, [0, 1], [0, 45], Extrapolation.CLAMP)}deg` },
    ],
  }))

  return (
    <AnimatedView style={rotateStyle}>
      <Icon name="add" size={FAB_ICON_SIZE} colorClassName="accent-primary-foreground" />
    </AnimatedView>
  )
}
