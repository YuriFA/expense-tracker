import type { ResolvedTheme } from './settings'

/**
 * Design tokens for the mobile app.
 *
 * These carry the **exact same oklch values** as the web design system
 * (`apps/web/src/style.css`) so the two twins render identically; only the
 * format differs - a plain JS object map instead of CSS custom properties.
 * React Native 0.76+ (new architecture) parses `oklch()` color strings, so the
 * values are passed through verbatim - no lossy hex conversion.
 *
 * Token naming follows the mobile design vocabulary (design.md section 9):
 * `ink` is the brand (near-black in light, near-white in dark), the only
 * saturated chrome color is `destructive`, and the chart ramp is data-only.
 */
export interface ThemeTokens {
  /** Page background. */
  background: string
  /** Default text / ink-on-surface. */
  foreground: string
  /** Raised surface (cards, sheets). */
  surface: string
  /** Foreground on a raised surface (same as foreground here). */
  surfaceForeground: string
  /** The brand ink - primary action fill + strong text. Near-black / near-white. */
  ink: string
  /** Foreground painted on top of `ink` (button label). */
  inkForeground: string
  /** Subtle wash for chips, skeletons, inactive tracks. */
  muted: string
  /** Secondary text on top of background/surface. */
  mutedForeground: string
  /** Hairline separators + outlines. */
  border: string
  /** Focus ring. */
  ring: string
  /** Destructive fill (delete / error only). */
  destructive: string
  /** Foreground on destructive fill. */
  destructiveForeground: string
  /** Data-viz ramp (category accents, future charts). */
  chart1: string
  chart2: string
  chart3: string
  chart4: string
  chart5: string
}

/**
 * Light theme - mirrors web `:root`. oklch values copied verbatim from
 * `apps/web/src/style.css`.
 */
export const lightTokens: ThemeTokens = {
  background: 'oklch(1 0 0)',
  foreground: 'oklch(0.145 0 0)',
  surface: 'oklch(1 0 0)',
  surfaceForeground: 'oklch(0.145 0 0)',
  ink: 'oklch(0.205 0 0)',
  inkForeground: 'oklch(0.985 0 0)',
  muted: 'oklch(0.97 0 0)',
  mutedForeground: 'oklch(0.556 0 0)',
  border: 'oklch(0.922 0 0)',
  ring: 'oklch(0.708 0 0)',
  destructive: 'oklch(0.577 0.245 27.325)',
  destructiveForeground: 'oklch(0.985 0 0)',
  chart1: 'oklch(0.646 0.222 41.116)',
  chart2: 'oklch(0.6 0.118 184.704)',
  chart3: 'oklch(0.398 0.07 227.392)',
  chart4: 'oklch(0.828 0.189 84.429)',
  chart5: 'oklch(0.769 0.188 70.08)',
}

/**
 * Dark theme - mirrors web `.dark`. Dark mirrors light by lightness, per the
 * design system. oklch values copied verbatim from `apps/web/src/style.css`.
 */
export const darkTokens: ThemeTokens = {
  background: 'oklch(0.145 0 0)',
  foreground: 'oklch(0.985 0 0)',
  surface: 'oklch(0.205 0 0)',
  surfaceForeground: 'oklch(0.985 0 0)',
  ink: 'oklch(0.922 0 0)',
  inkForeground: 'oklch(0.205 0 0)',
  muted: 'oklch(0.269 0 0)',
  mutedForeground: 'oklch(0.708 0 0)',
  border: 'oklch(1 0 0 / 10%)',
  ring: 'oklch(0.556 0 0)',
  destructive: 'oklch(0.704 0.191 22.216)',
  destructiveForeground: 'oklch(0.985 0 0)',
  chart1: 'oklch(0.488 0.243 264.376)',
  chart2: 'oklch(0.696 0.17 162.48)',
  chart3: 'oklch(0.769 0.188 70.08)',
  chart4: 'oklch(0.627 0.265 303.9)',
  chart5: 'oklch(0.645 0.246 16.439)',
}

export function getTokens(theme: ResolvedTheme): ThemeTokens {
  return theme === 'dark' ? darkTokens : lightTokens
}
