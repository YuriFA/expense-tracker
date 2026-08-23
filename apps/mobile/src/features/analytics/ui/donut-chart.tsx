// A purpose-built donut/ring chart over the Skia canvas - deliberately not a
// generic charting framework (design D3). Segments arrive pre-sorted and
// pre-capped from toChartEntries; the chart only maps integer weights to
// arcs. Center content is regular RN children absolutely positioned above
// the canvas, so no Skia text/font plumbing is needed.

import type { ReactNode } from 'react'
import { View } from 'react-native'
import { Canvas, Path, Skia, type SkPath } from '@shopify/react-native-skia'

interface DonutSegment {
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
  /** Screen-reader summary of the charted data (the canvas itself is not accessible). */
  accessibilityLabel?: string
  /** Center content: plain RN nodes rendered above the canvas. */
  children?: ReactNode
}

const FULL_CIRCLE = 360
/** Start at 12 o'clock, like the reference charts. */
const START_ANGLE = -90

export function DonutChart({
  segments,
  size,
  strokeWidth,
  gapDegrees = 2,
  accessibilityLabel,
  children,
}: DonutChartProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  // The stroke straddles the path, so the oval is inset by half its width.
  const oval = Skia.XYWHRect(
    strokeWidth / 2,
    strokeWidth / 2,
    size - strokeWidth,
    size - strokeWidth,
  )

  const arcs: Array<{ path: SkPath; color: string }> = []
  if (total > 0) {
    // A gap must not eat segments thinner than itself; a lone segment
    // renders gapless as a full ring.
    const gap = segments.length > 1 ? Math.min(gapDegrees, FULL_CIRCLE / segments.length) : 0
    let angle = START_ANGLE
    for (const segment of segments) {
      const sweep = (segment.value / total) * FULL_CIRCLE
      const path = Skia.Path.Make()
      // A hair of sweep so the slimmest capped segment still paints.
      path.addArc(oval, angle + gap / 2, Math.max(sweep - gap, 0.1))
      arcs.push({ path, color: segment.color })
      angle += sweep
    }
  }

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    >
      <Canvas style={{ position: 'absolute', width: size, height: size }}>
        {arcs.map(({ path, color }, index) => (
          <Path
            key={index}
            path={path}
            style="stroke"
            strokeWidth={strokeWidth}
            strokeCap="butt"
            color={color}
          />
        ))}
      </Canvas>
      {children}
    </View>
  )
}
