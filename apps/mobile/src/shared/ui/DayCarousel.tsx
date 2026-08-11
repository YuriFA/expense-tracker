import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, useWindowDimensions } from 'react-native'
import {
  Carousel,
  type CarouselItemAnimation,
  type CarouselRef,
  type CarouselRenderItemInfo,
} from 'react-native-reanimated-carousel'
import { Easing } from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@shared/store/use-settings-store'
import { formatDayNumber, formatHeaderDate, formatWeekdayShort } from '@shared/lib/format'
import { isSameDay, today } from '@shared/lib/date'
import {
  buildDayBuffer,
  clampOffset,
  dateForOffset,
  nearestEnabledOffset,
  offsetForDate,
  resolveDisabled,
  type DayBuffer,
  type DisabledSpec,
} from '@shared/lib/date-carousel'
import { useReduceMotion } from '@shared/lib/reduce-motion'
import { haptics } from '@shared/lib/haptics'
import { DayItem } from './DayItem'

/** Default chip slot width when `numberOfDays` is not supplied (~6 visible). */
const DEFAULT_ITEM_SIZE = 52
/** Chip height (the carousel row height). >=44pt touch target. */
const CHIP_HEIGHT = 60
/** Min/max chip slot width when derived from `numberOfDays`. */
const MIN_ITEM_SIZE = 44
const MAX_ITEM_SIZE = 96

export interface DayCarouselProps {
  /** Controlled selection (local calendar day). The component does NOT own it. */
  value: Date
  /** Fired once when a genuinely different day becomes the centered selection. */
  onChange: (date: Date) => void
  /** Inclusive lower bound. Open (infinite-feel past) when omitted. */
  minDate?: Date
  /** Inclusive upper bound. Open (infinite-feel future) when omitted. */
  maxDate?: Date
  /** Anchor for the open-ended span and the initial center. Defaults to `value`. */
  initialDate?: Date
  /** Roughly how many day chips are visible at once (derives the chip width). */
  numberOfDays?: number
  /** Dates that cannot be selected: a fixed list or a predicate. */
  disabledDates?: DisabledSpec
  testID?: string
  /** VoiceOver/TalkBack label for the whole carousel (radiogroup). */
  accessibilityLabel?: string
}

/**
 * Centered, swipe-to-snap horizontal day carousel backed by
 * `react-native-reanimated-carousel` (v5: reanimated v4 + RN 0.81 + New Arch).
 *
 * The selected day is centered; neighbor days peek on both sides; a swipe (or a
 * tap on a neighbor) snaps the nearest day to center and fires `onChange` once.
 * Selection is CONTROLLED: the parent owns `value`; this component only owns
 * carousel mechanics (the centered index). When the parent changes `value`
 * (e.g. the add-transaction form resets the date to today after a save), the
 * carousel scrolls to that date.
 *
 * See the PR description for the full architecture, infinite-scroll approach,
 * Date strategy, and edge-case handling.
 */
export function DayCarousel({
  value,
  onChange,
  minDate,
  maxDate,
  initialDate,
  numberOfDays,
  disabledDates,
  testID,
  accessibilityLabel,
}: DayCarouselProps) {
  const { t } = useTranslation()
  const locale = useSettingsStore((state) => state.locale)
  const reduceMotion = useReduceMotion()
  const { width: windowWidth } = useWindowDimensions()

  const todayLabel = t('home.today')
  const todayDate = useMemo(() => today(), [])

  // The buffer anchor is captured ONCE so the buffer (and thus the data array)
  // stays referentially stable for the component's lifetime - value changes
  // re-center via scrollTo rather than by rebuilding the buffer.
  const anchorRef = useRef<Date | null>(null)
  if (anchorRef.current === null) {
    anchorRef.current = initialDate ?? value
  }

  const buffer: DayBuffer = useMemo(
    () => buildDayBuffer({ minDate, maxDate, referenceDate: anchorRef.current as Date }),
    // anchorRef is captured once and read via .current; minDate + maxDate are
    // the only reactive inputs. The buffer must NOT recompute on every value
    // change (it would reset the carousel data + defaultIndex).
    [minDate, maxDate],
  )

  const data = useMemo(() => Array.from({ length: buffer.count }, (_, i) => i), [buffer])

  const isDisabled = useMemo(() => resolveDisabled(disabledDates), [disabledDates])

  const initialOffset = useMemo(
    () => clampOffset(buffer, offsetForDate(buffer, anchorRef.current as Date)),
    [buffer],
  )

  const [activeOffset, setActiveOffset] = useState<number>(initialOffset)
  const activeOffsetRef = useRef<number>(initialOffset)

  // --- Latest-value refs so the snap handler can stay referentially stable. -
  const bufferRef = useRef(buffer)
  bufferRef.current = buffer
  const isDisabledRef = useRef(isDisabled)
  isDisabledRef.current = isDisabled
  const valueRef = useRef(value)
  valueRef.current = value
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const reduceMotionRef = useRef(reduceMotion)
  reduceMotionRef.current = reduceMotion

  // --- Layout: measure the available width so the active chip centers exactly -
  const [containerWidth, setContainerWidth] = useState<number>(windowWidth)
  const onLayout = useCallback((width: number) => {
    setContainerWidth((prev) => (Math.abs(prev - width) < 0.5 ? prev : width))
  }, [])

  const itemSize = useMemo(() => {
    if (!numberOfDays) return DEFAULT_ITEM_SIZE
    return Math.max(MIN_ITEM_SIZE, Math.min(MAX_ITEM_SIZE, Math.floor(containerWidth / numberOfDays)))
  }, [numberOfDays, containerWidth])
  const centerOffset = Math.max(0, (containerWidth - itemSize) / 2)

  const carouselRef = useRef<CarouselRef>(null)

  // --- Position each item; add a constant centering offset so the active chip
  //     lands in the viewport center with neighbors peeking on both sides. ----
  const itemAnimation = useCallback<CarouselItemAnimation>(
    (relativeProgress: number) => {
      'worklet'
      return { transform: [{ translateX: relativeProgress * itemSize + centerOffset }] }
    },
    [itemSize, centerOffset],
  )

  const snapAnimation = useMemo(
    () =>
      reduceMotion
        ? ({ type: 'timing', duration: 0 } as const)
        : ({ type: 'timing', duration: 280, easing: Easing.out(Easing.cubic) } as const),
    [reduceMotion],
  )

  // --- Selection: a single path for swipe, fling, and tap. -----------------
  // The carousel engine drives everything through `onSnapToItem`; `handleSelect`
  // just asks the engine to scroll to a tapped neighbor.
  const handleSelect = useCallback(
    (offset: number) => {
      if (offset === activeOffsetRef.current) return
      carouselRef.current?.scrollTo({ index: offset, animated: !reduceMotion })
    },
    [reduceMotion],
  )

  const handleSnap = useCallback((index: number) => {
    const buf = bufferRef.current
    const offset = clampOffset(buf, index)
    const date = dateForOffset(buf, offset)

    if (isDisabledRef.current(date)) {
      // A fling landed on a disabled day: redirect to the nearest selectable
      // day. The redirect re-triggers `handleSnap` for the enabled offset, which
      // then announces + fires onChange normally.
      const nearest = nearestEnabledOffset(buf, offset, isDisabledRef.current)
      if (nearest !== null && nearest !== offset) {
        carouselRef.current?.scrollTo({ index: nearest, animated: !reduceMotionRef.current })
        return
      }
      // Whole buffer disabled: park without announcing a selection.
      activeOffsetRef.current = offset
      setActiveOffset(offset)
      return
    }

    activeOffsetRef.current = offset
    setActiveOffset(offset)
    if (!isSameDay(date, valueRef.current)) {
      onChangeRef.current(date)
      haptics.impact('light')
    }
  }, [])

  // --- External value change: scroll to it (once, on a real day change). ---
  useEffect(() => {
    const desired = clampOffset(buffer, offsetForDate(buffer, value))
    if (desired !== activeOffsetRef.current) {
      activeOffsetRef.current = desired
      carouselRef.current?.scrollTo({ index: desired, animated: !reduceMotion })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const renderItem = useCallback(
    ({ item: offset, relativeProgress }: CarouselRenderItemInfo<number>) => {
      const date = dateForOffset(buffer, offset)
      const isToday = isSameDay(date, todayDate)
      const weekdayLabel = isToday ? todayLabel : formatWeekdayShort(date, locale)
      const a11yLabel = `${isToday ? `${todayLabel}, ` : ''}${formatHeaderDate(date, locale)}`
      return (
        <DayItem
          progress={relativeProgress}
          weekdayLabel={weekdayLabel}
          dayNumber={formatDayNumber(date)}
          accessibilityLabel={a11yLabel}
          selected={offset === activeOffset}
          disabled={isDisabled(date)}
          width={itemSize}
          height={CHIP_HEIGHT}
          onPress={() => handleSelect(offset)}
        />
      )
    },
    [buffer, todayDate, todayLabel, locale, activeOffset, isDisabled, itemSize, handleSelect],
  )

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => onLayout(e.nativeEvent.layout.width)}
      style={{ width: '100%', height: CHIP_HEIGHT }}
    >
      <Carousel
        ref={carouselRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={(offset) => `day-${offset}`}
        defaultIndex={initialOffset}
        itemSize={itemSize}
        loop={false}
        snapMode="nearest"
        overscrollEnabled={false}
        itemAnimation={itemAnimation}
        animation={snapAnimation}
        onSnapToItem={handleSnap}
        style={{ width: containerWidth, height: CHIP_HEIGHT }}
        testID={testID}
      />
    </View>
  )
}
