/**
 * Base color tokens
 *
 * Palette direction: Pastel Playful Fintech with Soft-Brutalist influences -
 * warm paper background, ink lines, indigo brand primary, pastel lavender
 * fills, and a vivid "brand" accent palette for category/action colors.
 *
 * Colors are stored in oklch format for web (modern color space); the hex
 * equivalents for React Native live in colors.rn.ts. Keep the two in sync.
 */

export const colors = {
  // Neutral grays (oklch values from web)
  white: "oklch(1 0 0)",
  black: "oklch(0 0 0)",

  // Semantic colors - light mode
  light: {
    background: "oklch(0.977 0.007 80.721)",
    foreground: "oklch(0.223 0.027 290.565)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.223 0.027 290.565)",
    primary: "oklch(0.585 0.204 277.117)",
    "primary-foreground": "oklch(1 0 0)",
    secondary: "oklch(0.93 0.031 295.747)",
    "secondary-foreground": "oklch(0.326 0.073 284.845)",
    muted: "oklch(0.946 0.01 87.472)",
    "muted-foreground": "oklch(0.536 0.026 293.582)",
    accent: "oklch(0.913 0.045 295.214)",
    "accent-foreground": "oklch(0.326 0.073 284.845)",
    "brand-indigo": "oklch(0.585 0.204 277.117)",
    "brand-violet": "oklch(0.599 0.23 286.205)",
    "brand-lilac": "oklch(0.709 0.159 293.541)",
    "brand-orange": "oklch(0.705 0.187 47.604)",
    "brand-green": "oklch(0.723 0.192 149.579)",
    "brand-leaf": "oklch(0.627 0.17 149.214)",
    destructive: "oklch(0.577 0.215 27.325)",
    "destructive-foreground": "oklch(1 0 0)",
    border: "oklch(0.223 0.027 290.565)",
    input: "oklch(0.223 0.027 290.565)",
    ring: "oklch(0.585 0.204 277.117)",
    success: "oklch(0.627 0.17 149.214)",
    "success-foreground": "oklch(1 0 0)",
    warning: "oklch(0.646 0.194 41.116)",
    "warning-foreground": "oklch(1 0 0)",
  },

  // Semantic colors - dark mode
  dark: {
    background: "oklch(0.2 0.014 291.638)",
    foreground: "oklch(0.965 0.011 297.626)",
    card: "oklch(0.247 0.023 292.293)",
    "card-foreground": "oklch(0.965 0.011 297.626)",
    primary: "oklch(0.68 0.158 276.935)",
    "primary-foreground": "oklch(0.2 0.014 291.638)",
    secondary: "oklch(0.296 0.036 288.574)",
    "secondary-foreground": "oklch(0.895 0.041 293.199)",
    muted: "oklch(0.267 0.02 293.304)",
    "muted-foreground": "oklch(0.722 0.022 291.976)",
    accent: "oklch(0.315 0.041 289.817)",
    "accent-foreground": "oklch(0.895 0.041 293.199)",
    "brand-indigo": "oklch(0.585 0.204 277.117)",
    "brand-violet": "oklch(0.599 0.23 286.205)",
    "brand-lilac": "oklch(0.709 0.159 293.541)",
    "brand-orange": "oklch(0.705 0.187 47.604)",
    "brand-green": "oklch(0.723 0.192 149.579)",
    "brand-leaf": "oklch(0.627 0.17 149.214)",
    destructive: "oklch(0.637 0.208 25.331)",
    "destructive-foreground": "oklch(1 0 0)",
    border: "oklch(0.453 0.041 293.881)",
    input: "oklch(0.453 0.041 293.881)",
    ring: "oklch(0.68 0.158 276.935)",
    success: "oklch(0.723 0.192 149.579)",
    "success-foreground": "oklch(0.2 0.014 291.638)",
    warning: "oklch(0.705 0.187 47.604)",
    "warning-foreground": "oklch(0.2 0.014 291.638)",
  },
} as const

export type ColorToken = keyof typeof colors.light
