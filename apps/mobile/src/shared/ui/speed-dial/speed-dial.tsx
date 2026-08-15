import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icon } from '../icon'
import { useTheme } from '@/shared/config/theme'
import { colors as colorsRN } from '@expense-tracker/tokens/react-native'
import { SpeedDialAction as SpeedDialActionView } from './speed-dial-action'
import type { SpeedDialActionItem, SpeedDialPosition } from './speed-dial.types'
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
} from './constants'

export type { SpeedDialActionItem as SpeedDialAction, SpeedDialPosition } from './speed-dial.types'

const AnimatedView = Animated.View

interface SpeedDialProps {
  /** Actions to render, bottom-most (nearest the FAB) first. */
  actions: SpeedDialActionItem[]

  /** Custom closed-state icon for the FAB. Defaults to an `add` glyph. */
  icon?: React.ReactNode
  /**
   * Custom open-state icon. When both `icon` and `closeIcon` are provided the
   * two cross-fade; otherwise the single icon rotates 0->45deg on open.
   */
  closeIcon?: React.ReactNode
  /** FAB accessibility label when closed. @default "More actions" */
  label?: string
  /** FAB accessibility label when open. @default "Close actions" */
  closeLabel?: string

  /**
   * Horizontal anchoring. `bottom-right` / `bottom-left` pin the FAB to a corner
   * via `horizontalOffset`; `center` spans the full width and self-centers the
   * FAB and action column (used for a central tab-bar FAB). @default "bottom-right"
   */
  position?: SpeedDialPosition
  /**
   * Distance from the viewport's bottom edge to the FAB's bottom edge.
   * Defaults to the safe-area bottom inset + edge margin. When mounting over a
   * bottom tab bar pass the measured tab-bar height (already including its
   * safe-area padding) minus the desired overlap, e.g. `tabBarHeight - FAB_SIZE/2`
   * to straddle the bar's top edge - the component never hardcodes the tab-bar
   * height. Ignored for `horizontalOffset` when `position="center"`.
   */
  bottomOffset?: number
  /**
   * Distance from the near horizontal edge. Defaults to safe-area inset + margin.
   * Ignored when `position="center"` (the FAB self-centers).
   */
  horizontalOffset?: number

  /** Show the dimmed scrim. @default true */
  backdrop?: boolean
  /** Peak scrim opacity. @default 0.5 */
  backdropOpacity?: number
  actionSpacing?: number

  disabled?: boolean

  /** Base testID. Derives `{base}-fab`, `{base}-backdrop`, `{base}-action-{id}`. @default "speed-dial" */
  testID?: string
}

export function SpeedDial({
  actions,
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
    (action: SpeedDialActionItem) => {
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
        <View pointerEvents="box-none" className="flex flex-row items-center gap-8">
          {actions.map((action, index) => (
            <SpeedDialActionView
              key={action.id}
              action={{ ...action, onPress: () => handleActionPress(action) }}
              index={index}
              progress={progress}
              spacing={actionSpacing}
              position={position}
              testID={`${testID}-action-${action.id}`}
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
