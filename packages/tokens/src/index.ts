/**
 * Design tokens for Expense Tracker
 *
 * Shared design tokens for web and mobile platforms.
 * Provides type-safe access to all design system values.
 */

// Raw token exports (oklch format for web)
export { colors } from "./tokens/colors"
export { spacing } from "./tokens/spacing"
export {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  typography,
  type TypographyVariant,
} from "./tokens/typography"
export { borderRadius } from "./tokens/borderRadius"

// Type exports
export type { ColorToken } from "./tokens/colors"
export type { SpacingToken } from "./tokens/spacing"
export type { BorderRadiusToken } from "./tokens/borderRadius"

/**
 * Token metadata
 */
export const metadata = {
  version: "1.0.0",
  lastUpdated: "2025-01-13",
  colorSpace: "oklch",
} as const
