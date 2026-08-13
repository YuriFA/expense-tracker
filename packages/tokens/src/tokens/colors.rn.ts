/**
 * React Native color tokens (hex format)
 *
 * Converted from oklch values for React Native compatibility
 */

export const colorsRN = {
  // Neutral grays
  white: "#FFFFFF",
  black: "#000000",

  // Semantic colors - light mode
  light: {
    background: "#FFFFFF",
    foreground: "#1A1A1A",
    card: "#FFFFFF",
    "card-foreground": "#1A1A1A",
    primary: "#2D2D2D",
    "primary-foreground": "#FAFAFA",
    secondary: "#F5F5F5",
    "secondary-foreground": "#2D2D2D",
    muted: "#F5F5F5",
    "muted-foreground": "#737373",
    accent: "#F5F5F5",
    "accent-foreground": "#2D2D2D",
    destructive: "#DC2626",
    "destructive-foreground": "#FAFAFA",
    border: "#E5E5E5",
    input: "#E5E5E5",
    ring: "#A3A3A3",
    success: "#16A34A",
    "success-foreground": "#FAFAFA",
    warning: "#EA580C",
    "warning-foreground": "#FAFAFA",
  },

  // Semantic colors - dark mode
  dark: {
    background: "#1A1A1A",
    foreground: "#FAFAFA",
    card: "#2D2D2D",
    "card-foreground": "#FAFAFA",
    primary: "#E5E5E5",
    "primary-foreground": "#2D2D2D",
    secondary: "#404040",
    "secondary-foreground": "#FAFAFA",
    muted: "#404040",
    "muted-foreground": "#A3A3A3",
    accent: "#404040",
    "accent-foreground": "#FAFAFA",
    destructive: "#EF4444",
    "destructive-foreground": "#FAFAFA",
    border: "rgba(255, 255, 255, 0.1)",
    input: "rgba(255, 255, 255, 0.15)",
    ring: "#737373",
    success: "#22C55E",
    "success-foreground": "#1A1A1A",
    warning: "#F97316",
    "warning-foreground": "#1A1A1A",
  },
} as const

export type ColorTokenRN = keyof typeof colorsRN.light
