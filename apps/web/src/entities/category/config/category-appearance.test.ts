import { describe, it, expect } from 'vitest'
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, pickCategoryColor } from './category-appearance'

describe('category appearance', () => {
  it('pairs every icon with a unique color', () => {
    const colors = CATEGORY_ICONS.map((option) => option.color)
    expect(new Set(colors).size).toBe(CATEGORY_ICONS.length)
    expect(new Set(CATEGORY_ICONS.map((option) => option.icon)).size).toBe(CATEGORY_ICONS.length)
  })

  it('exposes a default icon from the set', () => {
    expect(CATEGORY_ICONS).toContain(DEFAULT_CATEGORY_ICON)
  })

  it('returns the paired color when it is free', () => {
    expect(pickCategoryColor('☕', ['#ea580c'])).toBe('#92400e')
  })

  it('walks outward to the nearest free palette color on collision', () => {
    expect(pickCategoryColor('☕', ['#92400e'])).toBe('#ea580c')
    expect(pickCategoryColor('☕', ['#92400e', '#ea580c'])).toBe('#dc2626')
  })

  it('falls back to the anchor color once the palette is exhausted', () => {
    const all = CATEGORY_ICONS.map((option) => option.color)
    expect(pickCategoryColor('☕', all)).toBe('#92400e')
  })

  it('handles an unknown icon by scanning the palette from the start', () => {
    expect(pickCategoryColor('🦄', ['#92400e'])).toBe('#ea580c')
  })
})
