/**
 * React Native color tokens (hex format)
 *
 * Palette direction: Pastel Playful Fintech with Soft-Brutalist influences -
 * warm paper background, ink lines, indigo brand primary, pastel lavender
 * fills, and a vivid "brand" accent palette for category/action colors.
 *
 * Converted from oklch values for React Native compatibility. Keep in sync
 * with colors.ts (oklch) and index.css (web); apps/mobile/global.css is
 * GENERATED from this file (pnpm --filter @expense-tracker/tokens
 * gen:mobile-theme) - never edit it by hand.
 */

export const colorsRN = {
  // Neutral grays
  white: "#FFFFFF",
  black: "#000000",

  // Semantic colors - light mode
  light: {
    background: "#FAF7F2",
    foreground: "#1B1927",
    card: "#FFFFFF",
    "card-foreground": "#1B1927",
    primary: "#6366F1",
    "primary-foreground": "#FFFFFF",
    secondary: "#E9E4FB",
    "secondary-foreground": "#312E58",
    muted: "#F0EDE6",
    "muted-foreground": "#6E6B7C",
    accent: "#E4DDFE",
    "accent-foreground": "#312E58",
    "brand-indigo": "#6366F1",
    "brand-violet": "#7C5CFF",
    "brand-lilac": "#A78BFA",
    "brand-orange": "#F97316",
    "brand-green": "#22C55E",
    "brand-leaf": "#16A34A",
    destructive: "#DC2626",
    "destructive-foreground": "#FFFFFF",
    border: "#1B1927",
    input: "#1B1927",
    ring: "#6366F1",
    success: "#16A34A",
    "success-foreground": "#FFFFFF",
    warning: "#EA580C",
    "warning-foreground": "#FFFFFF",
  },

  // Semantic colors - dark mode
  dark: {
    background: "#16151C",
    foreground: "#F4F2FA",
    card: "#211F2B",
    "card-foreground": "#F4F2FA",
    primary: "#818CF8",
    "primary-foreground": "#16151C",
    secondary: "#2C2A3E",
    "secondary-foreground": "#DDD8F6",
    muted: "#26242F",
    "muted-foreground": "#A5A3B2",
    accent: "#312E45",
    "accent-foreground": "#DDD8F6",
    "brand-indigo": "#6366F1",
    "brand-violet": "#7C5CFF",
    "brand-lilac": "#A78BFA",
    "brand-orange": "#F97316",
    "brand-green": "#22C55E",
    "brand-leaf": "#16A34A",
    destructive: "#EF4444",
    "destructive-foreground": "#FFFFFF",
    border: "#57526B",
    input: "#57526B",
    ring: "#818CF8",
    success: "#22C55E",
    "success-foreground": "#16151C",
    warning: "#F97316",
    "warning-foreground": "#16151C",
  },
} as const
