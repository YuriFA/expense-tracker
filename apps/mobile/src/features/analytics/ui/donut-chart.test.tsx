// Skia's GPU renderer is mocked in jest.setup.js (no pixels under Jest); the
// render assertions cover center content and the accessibility summary, the
// geometry assertions cover the pure hit-testing helper - real rendering is
// covered by the Maestro e2e flow.

import { describe, expect, it } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { Text } from '@/shared/ui/text'
import { DonutChart, segmentAt } from './donut-chart'

describe('DonutChart', () => {
  it('renders center content above the canvas with the a11y summary', () => {
    render(
      <DonutChart
        segments={[{ id: 'taxi', value: 30325, color: '#6366f1' }]}
        size={120}
        strokeWidth={16}
        accessibilityLabel="Расходы по категориям: Такси 100%"
      >
        <Text>30 325 ₽</Text>
      </DonutChart>,
    )
    expect(screen.getByText('30 325 ₽')).toBeTruthy()
    expect(screen.getByLabelText('Расходы по категориям: Такси 100%')).toBeTruthy()
  })

  it('renders multi-segment and empty input without errors', () => {
    render(
      <DonutChart
        segments={[
          { id: 'taxi', value: 20113, color: '#6366f1' },
          { id: 'pets', value: 6823, color: '#f97316' },
          { id: 'other', value: 3389, color: '#7c5cff' },
        ]}
        size={240}
        strokeWidth={24}
      >
        <Text>1 АВГУСТА – 31 АВГУСТА</Text>
      </DonutChart>,
    )
    expect(screen.getByText('1 АВГУСТА – 31 АВГУСТА')).toBeTruthy()
  })
})

// Geometry fixture: size 100, strokeWidth 20 → ring band radius [40, 60]
// (hit slack ±12 → accepted radius [28, 72]); angles are clockwise from the
// top of the chart.
const GEOMETRY = {
  size: 100,
  strokeWidth: 20,
  gapDegrees: 2,
} as const

const TWO_SEGMENTS = [
  { id: 'a', value: 75, color: '#6366f1' },
  { id: 'b', value: 25, color: '#f97316' },
]

describe('segmentAt', () => {
  it('resolves taps to the segment whose span contains the angle', () => {
    // a spans [0°, 270°), b spans [270°, 360°) from 12 o'clock.
    expect(
      segmentAt(TWO_SEGMENTS, GEOMETRY.size, GEOMETRY.strokeWidth, GEOMETRY.gapDegrees, 50, 0),
    ).toBe('a') // top
    expect(
      segmentAt(TWO_SEGMENTS, GEOMETRY.size, GEOMETRY.strokeWidth, GEOMETRY.gapDegrees, 95, 50),
    ).toBe('a') // right
    expect(
      segmentAt(TWO_SEGMENTS, GEOMETRY.size, GEOMETRY.strokeWidth, GEOMETRY.gapDegrees, 50, 100),
    ).toBe('a') // bottom
    expect(
      segmentAt(TWO_SEGMENTS, GEOMETRY.size, GEOMETRY.strokeWidth, GEOMETRY.gapDegrees, 5, 50),
    ).toBe('b') // left, 270°
    expect(
      segmentAt(TWO_SEGMENTS, GEOMETRY.size, GEOMETRY.strokeWidth, GEOMETRY.gapDegrees, 18.2, 18.2),
    ).toBe('b') // ~315°
  })

  it('covers the full ring for a single segment', () => {
    const single = [{ id: 'only', value: 7, color: '#6366f1' }]
    for (const [x, y] of [
      [50, 0],
      [95, 50],
      [50, 100],
      [5, 50],
    ]) {
      expect(
        segmentAt(single, GEOMETRY.size, GEOMETRY.strokeWidth, GEOMETRY.gapDegrees, x, y),
      ).toBe('only')
    }
  })

  it('rejects taps outside the ring band', () => {
    expect(
      segmentAt(TWO_SEGMENTS, GEOMETRY.size, GEOMETRY.strokeWidth, GEOMETRY.gapDegrees, 50, 50),
    ).toBeNull() // center
    expect(
      segmentAt(TWO_SEGMENTS, GEOMETRY.size, GEOMETRY.strokeWidth, GEOMETRY.gapDegrees, 50, 25),
    ).toBeNull() // inside the hole
    expect(
      segmentAt(TWO_SEGMENTS, GEOMETRY.size, GEOMETRY.strokeWidth, GEOMETRY.gapDegrees, 50, 125),
    ).toBeNull() // far outside
  })

  it('skips zero-weight segments', () => {
    const weighted = [
      { id: 'a', value: 100, color: '#6366f1' },
      { id: 'zero', value: 0, color: '#f97316' },
    ]
    expect(
      segmentAt(weighted, GEOMETRY.size, GEOMETRY.strokeWidth, GEOMETRY.gapDegrees, 5, 50),
    ).toBe('a')
  })
})
