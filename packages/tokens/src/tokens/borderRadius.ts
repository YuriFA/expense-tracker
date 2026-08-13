/**
 * Border radius tokens
 */

export const borderRadius = {
  base: "0.625rem", // 10px
  sm: "calc(var(--radius) - 4px)", // 2px
  md: "calc(var(--radius) - 2px)", // 4px
  lg: "var(--radius)", // 10px
  xl: "calc(var(--radius) + 4px)", // 14px
  full: "9999px",
} as const

export type BorderRadiusToken = keyof typeof borderRadius
