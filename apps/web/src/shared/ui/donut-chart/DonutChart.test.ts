import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DonutChart from './DonutChart.vue'

const entries: { id: string; label: string; color: string; value: number }[] = [
  { id: 'c1', label: 'Такси', color: '#7c5cff', value: 6000 },
  { id: 'c2', label: 'Еда', color: '#22c55e', value: 3000 },
  { id: 'c3', label: 'Книги', color: '#f97316', value: 1000 },
]

describe('DonutChart', () => {
  it('renders one segment per entry with proportional spans', () => {
    const wrapper = mount(DonutChart, { props: { entries, size: 100, strokeWidth: 10 } })
    const segments = wrapper.findAll('[data-testid="donut-segment"]')
    expect(segments).toHaveLength(3)
    // 60/30/10 split: the largest segment owns ~60% of the ring.
    const first = segments[0]!.attributes('stroke-dasharray')
    const [firstDash] = first!.split(' ').map(Number)
    const radius = (100 - 10) / 2 - 4
    const circumference = 2 * Math.PI * radius
    expect(firstDash).toBeGreaterThan(circumference * 0.55)
    expect(firstDash).toBeLessThan(circumference * 0.6)
  })

  it('renders a single segment as a full ring without gaps', () => {
    const wrapper = mount(DonutChart, {
      props: { entries: [entries[0]!], size: 100, strokeWidth: 10 },
    })
    const segments = wrapper.findAll('[data-testid="donut-segment"]')
    expect(segments).toHaveLength(1)
    // Full ring: the dash covers the whole circumference, gap part is 0.
    const parts = segments[0]!.attributes('stroke-dasharray')!.split(' ').map(Number)
    const dash = parts[0] ?? 0
    const gap = parts[1] ?? 0
    expect(gap).toBe(0)
    const radius = (100 - 10) / 2 - 4
    expect(dash).toBeCloseTo(2 * Math.PI * radius, 5)
  })

  it('renders a single neutral ring when nothing is chartable', () => {
    const wrapper = mount(DonutChart, { props: { entries: [], size: 100, strokeWidth: 10 } })
    expect(wrapper.findAll('[data-testid="donut-segment"]')).toHaveLength(0)
    const neutral = wrapper.find('circle')
    expect(neutral.exists()).toBe(true)
    expect(neutral.classes()).toContain('stroke-muted-foreground')
  })

  it('widens the selected segment, dims the others, and emits select on click', async () => {
    const wrapper = mount(DonutChart, {
      props: { entries, size: 100, strokeWidth: 10, selectedId: 'c1' },
    })
    const segments = wrapper.findAll('[data-testid="donut-segment"]')
    expect(segments[0]!.attributes('stroke-width')).toBe('16')
    expect(segments[1]!.attributes('opacity')).toBe('0.35')

    await segments[1]!.trigger('click')
    expect(wrapper.emitted('select')).toEqual([['c2']])
  })
})
