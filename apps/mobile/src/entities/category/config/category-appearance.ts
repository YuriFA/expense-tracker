// Predefined category appearance: the closed set of icons and circle
// background colors a category can be created with (spec: "an icon chosen
// from a predefined list, and a circle background color chosen from a
// predefined list").
//
// Colors are the RAW hex values of the brand tokens from
// @expense-tracker/tokens (kept in sync by hand, like the two token copies).
// They are DATA colors rendered via inline `style={{ backgroundColor }}` -
// not Uniwind classes - because they come from the category records, exactly
// like API-provided colors will. The design-tokens guard test carves this
// file out for that reason.

import type { IconName } from '@/shared/ui/icon'

/** Brand-token hex values (light theme = dark theme for brand colors). */
export const CATEGORY_COLORS = [
  '#f1f3fd', // brand-aliceblue
  '#6366f1', // brand-indigo
  '#7c5cff', // brand-violet
  '#a78bfa', // brand-lilac
  '#f97316', // brand-orange
  '#22c55e', // brand-green
  '#16a34a', // brand-leaf
] as const

export type CategoryColor = (typeof CATEGORY_COLORS)[number]

/** Predefined Ionicons glyphs for category chips. */
export const CATEGORY_ICONS = [
  'pricetag',
  'cart',
  'cafe',
  'restaurant',
  'fast-food',
  'car',
  'bus',
  'airplane',
  'home',
  'fitness',
  'heart',
  'paw',
  'game-controller',
  'gift',
  'school',
  'book',
  'cash',
  'card',
  'wallet',
  'film',
] as const satisfies readonly IconName[]

export type CategoryIcon = (typeof CATEGORY_ICONS)[number]

export const DEFAULT_CATEGORY_COLOR: CategoryColor = '#7c5cff'
export const DEFAULT_CATEGORY_ICON: CategoryIcon = 'pricetag'
