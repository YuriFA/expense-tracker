/**
 * React Native compatible tokens
 *
 * Exports design tokens in a format suitable for React Native
 */

export { colorsRN as colors } from "./tokens/colors.rn"
export { spacing } from "./tokens/spacing"
export { fontFamily, fontSize, fontWeight, lineHeight, typography, type TypographyVariant } from "./tokens/typography"
export { borderRadius } from "./tokens/borderRadius"

/**
 * Shadow tokens for React Native
 */
export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
} as const

export type ShadowToken = keyof typeof shadows
