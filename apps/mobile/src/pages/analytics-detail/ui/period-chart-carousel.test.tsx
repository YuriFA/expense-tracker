// resolveStep is the carousel's only pure decision (conventions: observable
// behavior, not animation frames); the gesture/settle mechanics are covered
// by the Maestro e2e flow. Reanimated and RNGH are mocked in jest.setup.js,
// so the render smoke test exercises the resting composition only.

import { describe, expect, it } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { Text } from '@/shared/ui/text'
import { PeriodChartCarousel, pageScaleFor, resolveStep } from './period-chart-carousel'

const WIDTH = 300
const EMPTY_PAGE = { segments: [], rangeLabel: 'АВГУСТ' }

describe('resolveStep', () => {
  it('advances one step in the drag direction past half a strip', () => {
    expect(resolveStep(-WIDTH / 2, 0, WIDTH)).toBe(1)
    expect(resolveStep(WIDTH / 2, 0, WIDTH)).toBe(-1)
  })

  it('settles back on a short slow drag', () => {
    expect(resolveStep(-WIDTH / 2 + 1, 0, WIDTH)).toBe(0)
    expect(resolveStep(WIDTH / 2 - 1, 0, WIDTH)).toBe(0)
    expect(resolveStep(0, 0, WIDTH)).toBe(0)
  })

  it('advances on a fling even from a short drag', () => {
    expect(resolveStep(-10, -600, WIDTH)).toBe(1)
    expect(resolveStep(10, 600, WIDTH)).toBe(-1)
  })

  it('keeps the drag direction when the fling opposes it', () => {
    expect(resolveStep(-10, 600, WIDTH)).toBe(0)
    expect(resolveStep(10, -600, WIDTH)).toBe(0)
  })

  it('never steps without a measured strip', () => {
    expect(resolveStep(-WIDTH, -1000, 0)).toBe(0)
  })
})

describe('pageScaleFor', () => {
  it('keeps the centered page full-size and parked ones shrunk at rest', () => {
    expect(pageScaleFor(0, 0, WIDTH)).toBe(1)
    expect(pageScaleFor(-1, 0, WIDTH)).toBeCloseTo(0.8)
    expect(pageScaleFor(1, 0, WIDTH)).toBeCloseTo(0.8)
  })

  it('interpolates both pages through the transition - the incoming grows as the current shrinks', () => {
    // Half a strip forward (pan -WIDTH/2): both sit midway at 0.9.
    expect(pageScaleFor(0, -WIDTH / 2, WIDTH)).toBeCloseTo(0.9)
    expect(pageScaleFor(1, -WIDTH / 2, WIDTH)).toBeCloseTo(0.9)
    // Fully swapped: the incoming page is full-size, the old one parked.
    expect(pageScaleFor(1, -WIDTH, WIDTH)).toBeCloseTo(1)
    expect(pageScaleFor(0, -WIDTH, WIDTH)).toBeCloseTo(0.8)
  })

  it('clamps beyond a full strip and stays 1 without a measured strip', () => {
    expect(pageScaleFor(1, -WIDTH * 2, WIDTH)).toBeCloseTo(0.8)
    expect(pageScaleFor(0, -WIDTH, 0)).toBe(1)
  })
})

describe('PeriodChartCarousel', () => {
  it('renders the resting chart (children) with both step controls', () => {
    render(
      <PeriodChartCarousel
        pages={{ prev: EMPTY_PAGE, cur: EMPTY_PAGE, next: EMPTY_PAGE }}
        onCommit={() => {}}
        resetEpoch={0}
        contentInset={24}
      >
        <Text testID="resting-chart">resting</Text>
      </PeriodChartCarousel>,
    )
    expect(screen.getByTestId('analytics-period-prev')).toBeTruthy()
    expect(screen.getByTestId('analytics-period-next')).toBeTruthy()
    expect(screen.getByTestId('resting-chart')).toBeTruthy()
  })
})
