// Guard: the category icon set has two copies sharing one vocabulary - the
// mobile copy is canonical (same model as the design-tokens palette). This
// test imports BOTH configs and fails on any drift in icons, paired colors,
// offered types, or set order, plus divergence in the derived helpers, so
// the pickers and the stored records stay identical across platforms.
//
// The mobile config's only import is a type (erased at transform time), so
// importing it from the web toolchain needs no mobile wiring.

import { describe, expect, it } from 'vitest'
import {
  CATEGORY_ICONS,
  categoryIconsForType,
  defaultCategoryIcon,
  pickCategoryColor,
} from './category-appearance'
import {
  CATEGORY_ICONS as MOBILE_CATEGORY_ICONS,
  categoryIconsForType as mobileCategoryIconsForType,
  defaultCategoryIcon as mobileDefaultCategoryIcon,
  pickCategoryColor as mobilePickCategoryColor,
} from '../../../../../../apps/mobile/src/entities/category/config/category-appearance'

describe('category icons sync (mobile canonical)', () => {
  it('mirrors the canonical set entry for entry (icon, color, types, order)', () => {
    expect(CATEGORY_ICONS).toEqual(MOBILE_CATEGORY_ICONS)
  })

  it('mirrors the per-type icon lists', () => {
    expect(categoryIconsForType('expense')).toEqual(mobileCategoryIconsForType('expense'))
    expect(categoryIconsForType('income')).toEqual(mobileCategoryIconsForType('income'))
  })

  it('mirrors the per-type defaults', () => {
    expect(defaultCategoryIcon('expense')).toBe(mobileDefaultCategoryIcon('expense'))
    expect(defaultCategoryIcon('income')).toBe(mobileDefaultCategoryIcon('income'))
  })

  it('mirrors the nearest-free color walk on representative inputs', () => {
    const cases: Array<[icon: string, taken: string[]]> = [
      ['🛒', []],
      ['🛒', ['#16a34a']],
      ['☕', ['#92400e', '#e11d48']],
      ['🦄', ['#16a34a', '#ea580c']],
    ]
    for (const [icon, taken] of cases) {
      expect(pickCategoryColor(icon, taken)).toBe(mobilePickCategoryColor(icon, taken))
    }
  })
})
