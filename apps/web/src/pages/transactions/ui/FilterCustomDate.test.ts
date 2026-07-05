import { describe, it, expect } from 'vitest'
import FilterCustomDate from './FilterCustomDate.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('FilterCustomDate', () => {
  it('mounts and renders trigger button', () => {
    const wrapper = mountWithProviders(FilterCustomDate, { repositories: {} })
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('renders Calendar icon', () => {
    const wrapper = mountWithProviders(FilterCustomDate, { repositories: {} })
    // svg should be rendered (CalendarIcon is an SVG)
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})
