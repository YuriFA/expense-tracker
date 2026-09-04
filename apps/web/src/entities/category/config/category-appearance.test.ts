import { describe, it, expect } from 'vitest'
import {
  CATEGORY_ICONS,
  categoryIconsForType,
  defaultCategoryIcon,
  pickCategoryColor,
} from './category-appearance'

describe('category appearance', () => {
  it('pairs every icon with a unique color', () => {
    const colors = CATEGORY_ICONS.map((option) => option.color)
    expect(new Set(colors).size).toBe(CATEGORY_ICONS.length)
    expect(new Set(CATEGORY_ICONS.map((option) => option.icon)).size).toBe(CATEGORY_ICONS.length)
  })

  it('offers every icon for at least one type, and only 🎁 for both', () => {
    expect(CATEGORY_ICONS.every((option) => option.types.length > 0)).toBe(true)
    const shared = CATEGORY_ICONS.filter((option) => option.types.length > 1)
    expect(shared.map((option) => option.icon)).toEqual(['🎁'])
  })

  it('filters the vocabulary by category type', () => {
    const expense = categoryIconsForType('expense')
    const income = categoryIconsForType('income')
    expect(expense.some((option) => option.icon === '🛒')).toBe(true)
    expect(expense.some((option) => option.icon === '💼')).toBe(false)
    expect(income.some((option) => option.icon === '💼')).toBe(true)
    expect(income.some((option) => option.icon === '🛒')).toBe(false)
    expect(expense.some((option) => option.icon === '🎁')).toBe(true)
    expect(income.some((option) => option.icon === '🎁')).toBe(true)
  })

  it('exposes per-type defaults from their sets', () => {
    expect(defaultCategoryIcon('expense')).toBe('🛒')
    expect(defaultCategoryIcon('income')).toBe('💼')
    expect(
      categoryIconsForType('expense').some((o) => o.icon === defaultCategoryIcon('expense')),
    ).toBe(true)
    expect(
      categoryIconsForType('income').some((o) => o.icon === defaultCategoryIcon('income')),
    ).toBe(true)
  })

  it('returns the paired color when it is free', () => {
    expect(pickCategoryColor('☕', ['#e11d48'])).toBe('#92400e')
  })

  it('walks outward to the nearest free palette color on collision', () => {
    expect(pickCategoryColor('☕', ['#92400e'])).toBe('#e11d48')
    expect(pickCategoryColor('☕', ['#92400e', '#e11d48'])).toBe('#dc2626')
  })

  it('falls back to the anchor color once the palette is exhausted', () => {
    const all = CATEGORY_ICONS.map((option) => option.color)
    expect(pickCategoryColor('☕', all)).toBe('#92400e')
  })

  it('handles an unknown icon by scanning the palette from the start', () => {
    expect(pickCategoryColor('🦄', ['#16a34a'])).toBe('#ea580c')
  })
})
