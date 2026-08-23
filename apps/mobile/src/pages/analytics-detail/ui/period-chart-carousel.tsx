// Gesture-following period carousel for the analytics detail screen: the
// chart tracks the finger, the adjacent period's chart slides in during the
// drag (the leaving one shrinking, the incoming one growing), and the step
// settles (or springs back) on release.
//
// Why an overlay instead of translating the resting chart: the committed
// cursor (React state) and the pan offset (UI-thread shared value) cannot be
// updated atomically, so rebasing the offset on commit would flash the old
// chart for a frame or two. Here every pixel change happens either purely on
// the UI thread (during a drag/settle) or inside ONE React commit (at the
// boundaries): while a session is live the resting chart is hidden and an
// inert overlay of three period pages (prev/cur/next) follows the finger
// across the full-width strip (under the arrows); when the settle finishes,
// the cursor commit and the overlay teardown land in a single batched
// setState, and the overlay's last frame is pixel-identical to the resting
// chart's next frame.
//
// panX is therefore NEVER reset at teardown: a JS-side reset can reach the
// UI thread before the unmount commit and snap the still-mounted overlay
// back to the pre-drag page for a frame (the old chart flashing over the new
// one). Instead the stale value is ignored - each new session zeroes it on
// the UI thread while no overlay is mounted to read it: drags in onBegin,
// arrow settles in the arm effect (both guarded by `overlayMounted` so
// grabbing a running settle keeps its position).
//
// The overlay mounts on gesture ACTIVATION, not touch-down: touches that
// never become horizontal pans - segment taps, vertical scrolls, arrow taps -
// must not churn React state, and mounting a few frames later only skips the
// sub-threshold (~15px) lead-in. Grabbing an arrow settle mid-flight stays
// continuous: onBegin snapshots the running offset into `baseX` and the drag
// continues from wherever the settle was.

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { View } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { DonutChart, type DonutSegment } from '@/features/analytics'
import { IconButton } from '@/shared/ui/icon-button'
import { Text } from '@/shared/ui/text'

const ACTIVE_OFFSET_X = 15
const FAIL_OFFSET_Y = 20
export const CHART_SIZE = 216
export const CHART_STROKE = 24
const SETTLE_DURATION_MS = 250
const EASE_OUT = Easing.out(Easing.cubic)
/** Flings slower than this (points per second) do not advance the period. */
const FLING_VELOCITY = 500
/** Scale of a fully off-center page - the carousel's depth cue. */
const PAGE_MIN_SCALE = 0.8
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 }

// The 'worklet' directive keeps the pure decisions on the UI thread: plain
// JS functions are remote in Reanimated 4 and cannot be called synchronously
// from gesture worklets. Worklets stay callable from the JS thread (tests).
// `stripWidth` is the carousel stride: the full chart-strip width.
export function resolveStep(
  translationX: number,
  velocityX: number,
  stripWidth: number,
): 1 | -1 | 0 {
  'worklet'
  if (stripWidth <= 0) return 0
  if (translationX < 0) {
    return translationX <= -stripWidth / 2 || velocityX < -FLING_VELOCITY ? 1 : 0
  }
  return translationX >= stripWidth / 2 || velocityX > FLING_VELOCITY ? -1 : 0
}

/**
 * Scale of the page at `slot` (-1/0/+1) for the current pan position: the
 * centered page is full-size, a fully slid-out one is PAGE_MIN_SCALE, and
 * both interpolate continuously - so the leaving chart shrinks while the
 * incoming one grows, following the finger through the whole transition.
 */
export function pageScaleFor(slot: number, pan: number, stripWidth: number): number {
  'worklet'
  if (stripWidth <= 0) return 1
  const distanceFromCenter = Math.abs(slot + pan / stripWidth)
  const centeredness = Math.min(Math.max(1 - distanceFromCenter, 0), 1)
  return PAGE_MIN_SCALE + (1 - PAGE_MIN_SCALE) * centeredness
}

interface PeriodCarouselPage {
  /** Pre-composed segments; a period without movement gets the neutral ring. */
  segments: DonutSegment[]
  /** Uppercase inclusive range label for the chart center (no testID here). */
  rangeLabel: string
  /** Emphasized segment; the current page mirrors the resting chart. */
  selectedSegmentId?: string
}

export interface PeriodCarouselPages {
  prev: PeriodCarouselPage
  cur: PeriodCarouselPage
  next: PeriodCarouselPage
}

interface PeriodChartCarouselProps {
  /** Pages for the three adjacent periods, recomputed by the screen per render. */
  pages: PeriodCarouselPages
  /** Fired once a settle lands on a neighbor; the screen commits the cursor. */
  onCommit: (step: 1 | -1) => void
  /**
   * Bumped whenever the cursor jumps outside the stepper (the kind selector
   * resets to the current period): an in-flight session is torn down at rest.
   */
  resetEpoch: number
  /**
   * The surrounding page content's horizontal padding: the strip bleeds past
   * it (negative margin) so pages travel edge-to-edge and clip only at the
   * screen edges, while the arrows stay at the content edge.
   */
  contentInset: number
  /** The resting interactive chart (segment taps, period-label testID). */
  children: ReactNode
}

/** One inert carousel page: the chart with its period label, no gestures. */
function CarouselPage({
  page,
  scale,
}: {
  page: PeriodCarouselPage
  scale: ReturnType<typeof useAnimatedStyle>
}) {
  return (
    <Animated.View className="w-full items-center justify-center" style={scale}>
      <DonutChart
        segments={page.segments}
        size={CHART_SIZE}
        strokeWidth={CHART_STROKE}
        selectedSegmentId={page.selectedSegmentId}
      >
        <Text variant="label" className="px-6 text-center uppercase text-muted-foreground">
          {page.rangeLabel}
        </Text>
      </DonutChart>
    </Animated.View>
  )
}

export function PeriodChartCarousel({
  pages,
  onCommit,
  resetEpoch,
  contentInset,
  children,
}: PeriodChartCarouselProps) {
  const [overlayActive, setOverlayActive] = useState(false)
  const [armed, setArmed] = useState<{ step: 1 | -1; epoch: number } | null>(null)
  const [stripWidth, setStripWidth] = useState<number | null>(null)
  // panX is the live visual offset (never reset at teardown - see the header
  // comment); baseX snapshots it on touch-down so a drag that grabs a running
  // settle continues from its position.
  const panX = useSharedValue(0)
  const baseX = useSharedValue(0)
  const overlayMounted = useSharedValue(false)
  const armEpoch = useRef(0)
  // Drags need the measured strip (gesture disabled until then); arrow taps
  // cannot precede the first layout, so they fall back to the chart size.
  const width = stripWidth ?? CHART_SIZE

  // The settle callback fires ~250ms after arming; always commit through the
  // latest screen closure (it owns the cursor).
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit

  const teardown = useCallback(() => {
    overlayMounted.value = false
    setArmed(null)
    setOverlayActive(false)
  }, [overlayMounted])

  const finishStep = useCallback(
    (step: 1 | -1 | 0) => {
      if (step !== 0) commitRef.current(step)
      teardown()
    },
    [teardown],
  )

  // A failed gesture that had already mounted the overlay (e.g. a vertical
  // scroll grabbing a running settle) settles back to rest before teardown -
  // an instant offset reset would jump.
  const settleBack = useCallback(() => {
    panX.value = withTiming(0, { duration: SETTLE_DURATION_MS, easing: EASE_OUT }, (finished) => {
      if (finished) runOnJS(teardown)()
    })
  }, [panX, teardown])

  const swipe = Gesture.Pan()
    .enabled(stripWidth !== null)
    .activeOffsetX([-ACTIVE_OFFSET_X, ACTIVE_OFFSET_X])
    .failOffsetY([-FAIL_OFFSET_Y, FAIL_OFFSET_Y])
    .onBegin(() => {
      if (!overlayMounted.value) {
        panX.value = 0
      }
      baseX.value = panX.value
    })
    .onStart(() => {
      overlayMounted.value = true
      runOnJS(setOverlayActive)(true)
    })
    .onUpdate((event) => {
      panX.value = baseX.value + event.translationX
    })
    .onEnd((event) => {
      const step = resolveStep(baseX.value + event.translationX, event.velocityX, width)
      panX.value = withTiming(
        -step * width,
        { duration: SETTLE_DURATION_MS, easing: EASE_OUT },
        (finished) => {
          if (finished) runOnJS(finishStep)(step)
        },
      )
    })
    .onFinalize((_event, success) => {
      if (!success && overlayMounted.value) runOnJS(settleBack)()
    })

  // Arrow taps run the same settle as a finished swipe. The animation is
  // armed through state so it starts only once the overlay has mounted (the
  // sanctioned imperative-Reanimated effect, like speed-dial's); each tap
  // re-arms (fresh epoch) so quick repeated taps chain settles.
  const handleArrowPress = (step: 1 | -1) => {
    armEpoch.current += 1
    setArmed({ step, epoch: armEpoch.current })
    setOverlayActive(true)
  }

  useLayoutEffect(() => {
    if (armed === null) return
    if (!overlayMounted.value) {
      panX.value = 0
      baseX.value = 0
    }
    panX.value = withTiming(
      -armed.step * width,
      { duration: SETTLE_DURATION_MS, easing: EASE_OUT },
      (finished) => {
        if (finished) runOnJS(finishStep)(armed.step)
      },
    )
    return () => cancelAnimation(panX)
  }, [armed, width, panX, baseX, overlayMounted, finishStep])

  // External cursor jumps (the kind selector) cut straight to rest.
  useLayoutEffect(() => {
    if (resetEpoch === 0) return
    cancelAnimation(panX)
    teardown()
  }, [resetEpoch, teardown, panX])

  const overlayStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: panX.value - width }],
  }))
  const prevPageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pageScaleFor(-1, panX.value, width) }],
  }))
  const curPageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pageScaleFor(0, panX.value, width) }],
  }))
  const nextPageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pageScaleFor(1, panX.value, width) }],
  }))

  return (
    <GestureDetector gesture={swipe}>
      {/* The strip spans the whole row plus the page padding on both sides
          (negative margin): pages travel the full horizontal axis, passing
          under the arrows, and clip only at the screen edges. */}
      <View
        className="relative items-center justify-center overflow-hidden"
        style={{ marginHorizontal: -contentInset }}
        onLayout={(event) => {
          const measured = event.nativeEvent.layout.width
          setStripWidth((current) => (current === measured ? current : measured))
        }}
      >
        {/* The resting chart stays mounted and tappable; while a session is
            live it is only hidden - the overlay provides identical pixels. */}
        <View style={{ opacity: overlayActive ? 0 : 1 }}>{children}</View>
        {overlayActive && stripWidth !== null ? (
          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="absolute inset-0 flex-row"
            style={overlayStyle}
          >
            <CarouselPage page={pages.prev} scale={prevPageStyle} />
            <CarouselPage page={pages.cur} scale={curPageStyle} />
            <CarouselPage page={pages.next} scale={nextPageStyle} />
          </Animated.View>
        ) : null}
        {/* The arrows ride on top of the strip at the content edge (not the
            screen edge), vertically centered, never blocking the charts. */}
        <View
          className="absolute top-0 bottom-0 z-10 justify-center"
          style={{ left: contentInset }}
        >
          <IconButton
            testID="analytics-period-prev"
            icon="chevron-back"
            size="sm"
            accessibilityLabel="Предыдущий период"
            hitSlop={HIT_SLOP}
            onPress={() => handleArrowPress(-1)}
          />
        </View>
        <View
          className="absolute top-0 bottom-0 z-10 justify-center"
          style={{ right: contentInset }}
        >
          <IconButton
            testID="analytics-period-next"
            icon="chevron-forward"
            size="sm"
            accessibilityLabel="Следующий период"
            hitSlop={HIT_SLOP}
            onPress={() => handleArrowPress(1)}
          />
        </View>
      </View>
    </GestureDetector>
  )
}
