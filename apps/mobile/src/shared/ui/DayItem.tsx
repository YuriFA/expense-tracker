import { StyleSheet, Pressable } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated'
import { useTokens } from './theme'
import { familyForWeight, type FontWeight } from '@shared/lib/fonts'
import { useReduceMotion } from '@shared/lib/reduce-motion'

/**
 * Typography for the two stacked labels. Mirrors the `caption` / `body` entries
 * in {@link file://./Text.tsx} (`SIZE_LINE_HEIGHT`); duplicated here only because
 * the selection color is animated via `Animated.Text` (the kit `Text` paints a
 * static color). Keep these in lock-step with `Text.tsx`.
 */
const CAPTION_TYPOGRAPHY = { fontSize: 12, lineHeight: 16 } as const
const NUMBER_TYPOGRAPHY = { fontSize: 16, lineHeight: 20 } as const

export interface DayItemProps {
  /**
   * Continuous position of this item relative to the carousel center, driven by
   * the carousel engine: `0` = centered/selected, `±1` = immediate neighbor,
   * `±2` = one further out. All visual choreography (scale, ink fill, color) is
   * derived from this so the selection crossfades smoothly during a swipe.
   */
  progress: SharedValue<number>
  /** Weekday abbreviation, or the localized "Today" label for today's chip. */
  weekdayLabel: string
  /** Day-of-month number (1..31). */
  dayNumber: string
  /** VoiceOver/TalkBack label, e.g. "Today, Monday, August 13". */
  accessibilityLabel: string
  /** Whether THIS item is the carousel's centered (selected) day - for the a11y
   * selected flag only (the visual fill is driven by `progress`). */
  selected: boolean
  /** Muted + non-interactive: never receives the ink fill and cannot be tapped. */
  disabled: boolean
  /** Chip slot dimensions, supplied by the carousel so item + slot stay aligned. */
  width: number
  height: number
  onPress: () => void
}

/**
 * Maximally presentational day chip for `DayCarousel`. Knows nothing about
 * dates, ranges, or the carousel engine beyond the `progress` SharedValue it
 * animates against. All selection/disabled visuals are derived from props; the
 * parent owns date logic and passes ready-to-render labels.
 *
 * Animation (subtle, Reanimated, on the UI thread):
 *  - center item: scale 1, full ink fill, inverse text.
 *  - neighbors: scale ~0.92, no fill, foreground/muted text, dimmed with
 *    distance so the centered day reads as the selection.
 *  - disabled: never filled, always dimmed/muted, not pressable.
 *
 * Reduce Motion: the spatial scale choreography and distance dimming are
 * dropped (scale stays 1, content opacity stays 1); the ink fill + text-color
 * crossfade remain because they convey selection *state* (not spatial motion),
 * matching design.md section 11 ("choreography simplifies, semantics kept").
 */
export function DayItem({
  progress,
  weekdayLabel,
  dayNumber,
  accessibilityLabel,
  selected,
  disabled,
  width,
  height,
  onPress,
}: DayItemProps) {
  const tokens = useTokens()
  const reduceMotion = useReduceMotion()

  // Spatial scale + distance dimming. Skipped under Reduce Motion.
  const scaleStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {}
    const scale = interpolate(
      progress.value,
      [-2, -1, 0, 1, 2],
      [0.84, 0.92, 1, 0.92, 0.84],
      Extrapolation.CLAMP,
    )
    return { transform: [{ scale }] }
  })

  // Ink fill opacity: peaks at the center and fades out within half a slot so
  // the selection hands off smoothly between the outgoing and incoming day.
  const fillStyle = useAnimatedStyle(() => {
    if (disabled) return { opacity: 0 }
    const opacity = interpolate(
      progress.value,
      [-0.5, 0, 0.5],
      [0, 1, 0],
      Extrapolation.CLAMP,
    )
    return { opacity }
  })

  // Dim content with distance (farther = weaker). Disabled stays dim.
  const contentOpacityStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: disabled ? 0.4 : 1 }
    const base = interpolate(
      progress.value,
      [-2, -1, 0, 1, 2],
      [0.4, 0.65, 1, 0.65, 0.4],
      Extrapolation.CLAMP,
    )
    return { opacity: disabled ? 0.4 : base }
  })

  // Text color flips to the ink's foreground as the fill comes in, so the
  // number stays legible on the dark fill. Shared by both labels.
  const textColorStyle = useAnimatedStyle(() => {
    if (disabled) return { color: tokens.mutedForeground }
    const color = interpolateColor(
      progress.value,
      [-0.5, 0, 0.5],
      [tokens.mutedForeground, tokens.inkForeground, tokens.mutedForeground],
    )
    return { color }
  })

  const captionTextStyle = [
    styles.caption,
    { fontFamily: familyForWeight(500 as FontWeight) },
    textColorStyle,
  ]
  const numberTextStyle = [
    styles.number,
    { fontFamily: familyForWeight(600 as FontWeight) },
    textColorStyle,
  ]

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={disabled ? { disabled: true } : { selected }}
      // No `disabled` prop: we keep full control of the visuals (RN's default
      // disabled dimming would fight the progress-driven opacity). Tappability
      // is gated by passing `undefined` for the press handler when disabled.
      onPress={disabled ? undefined : onPress}
      style={{ width, height }}
    >
      <Animated.View style={[styles.chip, scaleStyle, { width, height }]}>
        {/* Ink fill layer (crossfades under the content). */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: tokens.ink }, fillStyle]}
        />
        <Animated.View style={[styles.content, contentOpacityStyle]}>
          <Animated.Text style={captionTextStyle}>{weekdayLabel}</Animated.Text>
          <Animated.Text style={numberTextStyle}>{dayNumber}</Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    ...CAPTION_TYPOGRAPHY,
  },
  number: {
    ...NUMBER_TYPOGRAPHY,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
})
