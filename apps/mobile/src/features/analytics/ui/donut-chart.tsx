// A purpose-built donut/ring chart over the Skia canvas - deliberately not a
// generic charting framework (design D3). Segments arrive pre-sorted (and,
// on the tab cards, pre-capped from toChartEntries); the chart only maps
// integer weights to arcs. Center content is regular RN children absolutely
// positioned above the canvas, so no Skia text/font plumbing is needed.
//
// Detail-screen interactivity: segments carry ids; `selectedSegmentId`
// widens that segment's stroke in place (no reordering) and dims the others,
// and `onPressSegment` reports taps. Taps are hit-tested manually from a
// Gesture.Tap on the wrapper (the pure `segmentAt` helper, unit-tested);
// without these props the chart is inert - the tab cards render it plain.

import type { ReactNode } from 'react'
import { View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { Canvas, Path, Skia, type SkPath } from '@shopify/react-native-skia'

export interface DonutSegment {
  /** Stable id (a category id or a synthetic one) reported by onPressSegment. */
  id: string
  /** Relative weight; in practice the entry's integer minor-unit total. */
  value: number
  /** Paint color: a category hex or the «Прочие» neutral. */
  color: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  size: number
  strokeWidth: number
  /** Angular gap between segments; a single segment renders a full ring. */
  gapDegrees?: number
  /** Emphasized segment: slightly wider stroke, the others dimmed. */
  selectedSegmentId?: string
  /** Segment tap reporter; wired through the wrapper's Gesture.Tap. */
  onPressSegment?: (id: string) => void
  /** Screen-reader summary of the charted data (the canvas itself is not accessible). */
  accessibilityLabel?: string
  /** Center content: plain RN nodes rendered above the canvas. */
  children?: ReactNode
}

const FULL_CIRCLE = 360
/** Start at 12 o'clock, like the reference charts. */
const START_ANGLE = -90
const SELECTED_STROKE_BONUS = 6
const DIMMED_OPACITY = 0.35
/** Slack beyond the ring's outer/inner edge where a tap still counts. */
const HIT_SLACK = 12

/** Contiguous per-segment angular spans, degrees from 12 o'clock, clockwise. */
interface SegmentSpan {
  id: string
  start: number
  sweep: number
}

function segmentSpans(segments: DonutSegment[]): SegmentSpan[] {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  if (total <= 0) return []
  // Spans are contiguous (gaps are a drawing concern, not a partition one):
  // a tap landing in a 2° gap still resolves to its neighboring segment.
  let angle = 0
  return segments.map((segment) => {
    const sweep = (segment.value / total) * FULL_CIRCLE
    const span = { id: segment.id, start: angle, sweep }
    angle += sweep
    return span
  })
}

/**
 * Map a tap (view coordinates) to a segment id, or null when the tap lands
 * outside the ring band (center, far outside) or on no segment. Gaps count
 * toward their neighboring segment - they are 2° slivers, not targets.
 */
export function segmentAt(
  segments: DonutSegment[],
  size: number,
  strokeWidth: number,
  gapDegrees: number,
  x: number,
  y: number,
): string | null {
  const center = size / 2
  const dx = x - center
  const dy = y - center
  const distance = Math.hypot(dx, dy)
  if (distance < center - strokeWidth / 2 - HIT_SLACK) return null
  if (distance > center + strokeWidth / 2 + HIT_SLACK) return null
  // Screen coordinates (y down): atan2 + 90° gives degrees from 12 o'clock,
  // clockwise (top → 0, right → 90).
  const fromTop = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + FULL_CIRCLE) % FULL_CIRCLE
  for (const span of segmentSpans(segments)) {
    if (fromTop >= span.start && fromTop < span.start + span.sweep) return span.id
  }
  return null
}

export function DonutChart({
  segments,
  size,
  strokeWidth,
  gapDegrees = 2,
  selectedSegmentId,
  onPressSegment,
  accessibilityLabel,
  children,
}: DonutChartProps) {
  // The stroke straddles the path, so the oval is inset by half its width.
  const oval = Skia.XYWHRect(
    strokeWidth / 2,
    strokeWidth / 2,
    size - strokeWidth,
    size - strokeWidth,
  )

  const spans = segmentSpans(segments)
  const gap = segments.length > 1 ? Math.min(gapDegrees, FULL_CIRCLE / segments.length) : 0
  const arcs: Array<{ span: SegmentSpan; path: SkPath; color: string }> = spans.map(
    (span, index) => {
      const path = Skia.Path.Make()
      // A hair of sweep so the slimmest capped segment still paints.
      path.addArc(oval, START_ANGLE + span.start + gap / 2, Math.max(span.sweep - gap, 0.1))
      return { span, path, color: segments[index].color }
    },
  )
  const hasSelection = selectedSegmentId !== undefined

  const tap =
    onPressSegment &&
    Gesture.Tap()
      .runOnJS(true)
      .onEnd((event, success) => {
        if (!success) return
        const id = segmentAt(segments, size, strokeWidth, gapDegrees, event.x, event.y)
        if (id) onPressSegment(id)
      })

  return (
    <GestureDetector gesture={tap ?? Gesture.Tap().enabled(false)}>
      <View
        style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
      >
        <Canvas style={{ position: 'absolute', width: size, height: size }}>
          {arcs.map(({ span, path, color }) => {
            const isSelected = selectedSegmentId === span.id
            return (
              <Path
                key={span.id}
                path={path}
                style="stroke"
                strokeWidth={isSelected ? strokeWidth + SELECTED_STROKE_BONUS : strokeWidth}
                strokeCap="butt"
                color={color}
                opacity={hasSelection && !isSelected ? DIMMED_OPACITY : 1}
              />
            )
          })}
        </Canvas>
        {children}
      </View>
    </GestureDetector>
  )
}
