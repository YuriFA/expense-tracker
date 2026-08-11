import { useEffect, useMemo } from 'react'
import { StyleSheet, Pressable, ScrollView, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import type { AppLocale } from '@expense-tracker/i18n'
import { useSettingsStore } from '@shared/store/use-settings-store'
import { formatWeekdayShort, formatDayNumber, formatHeaderDate } from '@shared/lib/format'
import { dayWindow, isSameDay, today } from '@shared/lib/date'
import { useReduceMotion } from '@shared/lib/reduce-motion'
import { haptics } from '@shared/lib/haptics'
import { useTokens } from './theme'
import { Text } from './Text'
import { cn } from '@shared/lib/cn'

interface DateCarouselProps {
  /** The selected calendar day (normalized to local midnight by the owner). */
  value: Date
  /** Called when the user taps a day chip. */
  onChange: (date: Date) => void
  /** Number of days to show, ending today (inclusive). Defaults to 14. */
  dayCount?: number
  /** A11y label for the whole carousel. */
  accessibilityLabel?: string
  /** Extra classes composed onto the root (react-native-reusables idiom). */
  className?: string
}

/**
 * Horizontal date carousel (Mibu-style minimal expense-tracker add flow): a
 * scrollable row of recent day chips ending at today, which is selected by
 * default. Tapping a chip back-dates the transaction. The selected chip takes
 * the ink fill with a smooth reanimated crossfade (an instant swap for Reduce
 * Motion); a light haptic fires on change. Locale-aware weekday + day number,
 * `Intl`-free (Hermes-safe).
 *
 * The carousel is calendar-day driven: selection compares Y/M/D, so passing a
 * new `Date` instance for the same day does not re-trigger the animation.
 */
export function DateCarousel({
  value,
  onChange,
  dayCount = 14,
  accessibilityLabel,
  className,
}: DateCarouselProps) {
  const { t } = useTranslation()
  const locale = useSettingsStore((state) => state.locale)
  const days = useMemo(() => dayWindow(today(), dayCount), [dayCount])
  const todayDate = useMemo(() => today(), [])

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: 2 }}
      className={cn(className)}
    >
      {days.map((day) => {
        const selected = isSameDay(day, value)
        const isToday = isSameDay(day, todayDate)
        const topLabel = isToday ? t('home.today') : formatWeekdayShort(day, locale)
        return (
          <DateChip
            key={day.toISOString()}
            day={day}
            topLabel={topLabel}
            locale={locale}
            selected={selected}
            onSelect={onChange}
          />
        )
      })}
    </ScrollView>
  )
}

interface DateChipProps {
  day: Date
  topLabel: string
  locale: AppLocale
  selected: boolean
  onSelect: (date: Date) => void
}

/**
 * One carousel chip: weekday/"Today" label over the day number. The selection
 * fill crossfades via reanimated (respecting Reduce Motion); pressing scales
 * the chip down slightly for a native-feeling tap.
 */
function DateChip({ day, topLabel, locale, selected, onSelect }: DateChipProps) {
  const tokens = useTokens()
  const reduceMotion = useReduceMotion()

  // Selection fill crossfade (ink opacity 0 <-> 1), driven by `selected`.
  const fill: SharedValue<number> = useSharedValue(selected ? 1 : 0)
  useEffect(() => {
    fill.value = reduceMotion
      ? selected
        ? 1
        : 0
      : withTiming(selected ? 1 : 0, { duration: 180, easing: Easing.out(Easing.ease) })
  }, [selected, reduceMotion, fill])

  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }))

  // Press scale, driven by the Pressable's in/out callbacks.
  const scale: SharedValue<number> = useSharedValue(1)
  const handlePressIn = () => {
    if (!reduceMotion) scale.value = withTiming(0.94, { duration: 90, easing: Easing.out(Easing.ease) })
  }
  const handlePressOut = () => {
    if (!reduceMotion) scale.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.ease) })
  }
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const handleSelect = () => {
    if (!selected) {
      haptics.impact('light')
      onSelect(day)
    }
  }

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={formatHeaderDate(day, locale)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handleSelect}
    >
      <Animated.View style={scaleStyle}>
        <View
          className="w-[52px] min-h-[60px] items-center justify-center rounded-2xl border-hairline overflow-hidden"
          style={{ borderColor: selected ? 'transparent' : tokens.border }}
        >
          {/* Ink fill layer (crossfades in/out under the content). */}
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: tokens.ink }, fillStyle]}
          />
          <Text size="caption" weight={500} tone={selected ? 'inverse' : 'muted'}>
            {topLabel}
          </Text>
          <Text size="body" weight={600} tabular tone={selected ? 'inverse' : 'default'}>
            {formatDayNumber(day)}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  )
}
