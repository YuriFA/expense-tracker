import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icon } from '../icon'
import { useTheme } from '@/shared/config/theme'
import { colors as colorsRN } from '@expense-tracker/tokens/react-native'
import { SpeedDialAction as SpeedDialActionView } from './speed-dial-action'
import type { SpeedDialAction, SpeedDialProps } from './speed-dial.types'
import {
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
  REDUCED_EASE,
  REDUCED_MOTION_DURATION,
} from './constants'

export type { SpeedDialAction, SpeedDialProps, SpeedDialPosition } from './speed-dial.types'

const AnimatedView = Animated.View

/**
 * SpeedDial - generic expandable floating action button.
 *
 * Renders a circular FAB that expands a vertical stack of actions over a dimmed
 * backdrop. Controlled (`open`/`onOpenChange`) or uncontrolled
 * (`defaultOpen`). All animation is driven by a single Reanimated shared value
 * (`progress`), so rapid open/close is race-free (no JS timers). See README.md
 * for the full architecture decision.
 *
 * Mount as a sibling of your scrollable content (not inside a ScrollView). Pass
 * `bottomOffset` when mounting over a bottom tab bar.
 */
export function SpeedDial(props: SpeedDialProps) {
  const {
    actions,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    icon,
    closeIcon,
    label = DEFAULT_LABEL,
    closeLabel = DEFAULT_CLOSE_LABEL,
    position = 'bottom-right',
    bottomOffset,
    horizontalOffset,
    backdrop = true,
    backdropOpacity = DEFAULT_BACKDROP_OPACITY,
    actionSpacing = 12,
    disabled = false,
    testID = DEFAULT_TEST_ID,
  } = props

  // --- Controlled / uncontrolled open state (single API) ---
  const isControlled = openProp !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(defaultOpen)
  const open = isControlled ? openProp : uncontrolledOpen
  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )

  // --- Single source of animation truth ---
  const progress = useSharedValue(open ? 1 : 0)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const target = open ? 1 : 0
    progress.value = withTiming(target, {
      duration: reducedMotion ? REDUCED_MOTION_DURATION : open ? OPEN_DURATION : CLOSE_DURATION,
      easing: reducedMotion ? REDUCED_EASE : EASE_OUT,
    })
  }, [open, reducedMotion, progress])

  const insets = useSafeAreaInsets()
  const isRight = position === 'bottom-right'
  const isCenter = position === 'center'
  const resolvedBottomOffset = bottomOffset ?? insets.bottom + DEFAULT_EDGE_MARGIN
  // Anchors the corner variants only; `center` spans the full width and
  // self-centers, so this value is unused when `position="center"`.
  const resolvedHorizontalOffset =
    horizontalOffset ?? (isRight ? insets.right : insets.left) + DEFAULT_EDGE_MARGIN

  const { resolvedTheme } = useTheme()
  const fabIconColor = colorsRN[resolvedTheme]['primary-foreground']

  const toggle = useCallback(() => {
    if (disabled) return
    setOpen(!open)
  }, [disabled, open, setOpen])

  const handleActionPress = useCallback(
    (action: SpeedDialAction) => {
      // Close first, then invoke the callback (never awaited) so navigation
      // triggered by the callback never runs under an open overlay.
      setOpen(false)
      action.onPress()
    },
    [setOpen],
  )

  const fabLabel = open ? closeLabel : label

  return (
    <View testID={testID} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {backdrop ? (
        <Backdrop
          testID={`${testID}-backdrop`}
          progress={progress}
          opacity={backdropOpacity}
          open={open}
          onClose={() => setOpen(false)}
        />
      ) : null}

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          bottom: resolvedBottomOffset,
          ...(isCenter
            ? { left: 0, right: 0, alignItems: 'center' }
            : isRight
              ? { right: resolvedHorizontalOffset, alignItems: 'flex-end' }
              : { left: resolvedHorizontalOffset, alignItems: 'flex-start' }),
        }}
      >
        {/* Actions grow upward; column-reverse keeps action[0] nearest the FAB. */}
        <View
          pointerEvents="box-none"
          style={{
            flexDirection: 'column-reverse',
            alignItems: isCenter ? 'center' : isRight ? 'flex-end' : 'flex-start',
          }}
        >
          {actions.map((action, index) => (
            <SpeedDialActionView
              key={action.id}
              action={{ ...action, onPress: () => handleActionPress(action) }}
              index={index}
              progress={progress}
              spacing={actionSpacing}
              position={position}
              testID={`${testID}-action-${action.id}`}
              reducedMotion={reducedMotion}
              open={open}
            />
          ))}
        </View>

        <Pressable
          testID={`${testID}-fab`}
          onPress={toggle}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={fabLabel}
          accessibilityState={{ expanded: open, disabled }}
          accessibilityHint="Opens or closes the action menu"
          className="items-center justify-center rounded-full bg-primary shadow-lg"
          style={({ pressed }) => [
            {
              width: FAB_SIZE,
              height: FAB_SIZE,
              marginTop: actionSpacing,
            },
            pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] },
          ]}
        >
          <FabIcon progress={progress} icon={icon} closeIcon={closeIcon} color={fabIconColor} />
        </Pressable>
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
  opacity,
  open,
  onClose,
}: {
  testID: string
  progress: ReturnType<typeof useSharedValue<number>>
  opacity: number
  open: boolean
  onClose: () => void
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, opacity], Extrapolation.CLAMP),
  }))

  return (
    <Pressable
      testID={testID}
      onPress={onClose}
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityRole="button"
      accessibilityLabel={DEFAULT_BACKDROP_LABEL}
      accessibilityHint="Closes the action menu"
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      style={StyleSheet.absoluteFill}
    >
      <AnimatedView
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, style]}
        className="bg-black"
      />
    </Pressable>
  )
}

/**
 * The FAB icon: defaults to an `add` glyph that rotates 0->45deg to become an
 * `x`. When both a custom `icon` and `closeIcon` are provided they cross-fade
 * instead (rotation would distort custom art).
 */
function FabIcon({
  progress,
  icon,
  closeIcon,
  color,
}: {
  progress: ReturnType<typeof useSharedValue<number>>
  icon?: React.ReactNode
  closeIcon?: React.ReactNode
  color: string
}) {
  const rotateStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(progress.value, [0, 1], [0, 45], Extrapolation.CLAMP)}deg` },
    ],
  }))
  const closedLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
  }))
  const openLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
  }))

  const box: ViewStyle = {
    width: FAB_ICON_SIZE,
    height: FAB_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  }

  if (icon != null && closeIcon != null) {
    return (
      <View style={{ width: FAB_ICON_SIZE, height: FAB_ICON_SIZE }}>
        <AnimatedView style={[StyleSheet.absoluteFill, box, closedLayerStyle]}>{icon}</AnimatedView>
        <AnimatedView style={[StyleSheet.absoluteFill, box, openLayerStyle]}>
          {closeIcon}
        </AnimatedView>
      </View>
    )
  }

  const content = icon != null ? icon : <Icon name="add" size={FAB_ICON_SIZE} color={color} />
  return <AnimatedView style={rotateStyle}>{content}</AnimatedView>
}
