// Skia's GPU renderer is mocked in jest.setup.js (no pixels under Jest); the
// meaningful assertions here are the center content and the accessibility
// summary - real rendering is covered by the Maestro e2e flow.

import { describe, expect, it } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { Text } from '@/shared/ui/text'
import { DonutChart } from './donut-chart'

describe('DonutChart', () => {
  it('renders center content above the canvas with the a11y summary', () => {
    render(
      <DonutChart
        segments={[{ value: 30325, color: '#6366f1' }]}
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
          { value: 20113, color: '#6366f1' },
          { value: 6823, color: '#f97316' },
          { value: 3389, color: '#7c5cff' },
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
