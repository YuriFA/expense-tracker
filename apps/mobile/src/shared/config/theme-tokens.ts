import type { ResolvedTheme } from './settings'

/**
 * Design tokens for the mobile app.
 *
 * The mobile palette is an **rgba (sRGB) encoding** of the same design-system
 * colors as the web twin (`apps/web/src/style.css`, which stays on `oklch()`).
 * The two twins render (near-)identically; only the *format* differs - a plain
 * JS object map of `rgba()` strings instead of CSS custom properties.
 *
 * Why rgba and not oklch here: `react-native-reanimated` cannot parse or
 * interpolate `oklch()` colors, so any `interpolateColor` / animated-color work
 * needs sRGB `rgba()`/`#rrggbb` values. The JS token map is what reanimated
 * reads (inline styles via `useTokens()`), so it carries the rgba form. Browsers
 * render oklch fine, so the web twin keeps the wider-gamut oklch values.
 *
 * SYNC RULE (mobile-rgba <-> web-oklch): when a color changes, edit the oklch
 * value in `apps/web/src/style.css` FIRST, then re-derive the matching rgba by
 * the verified oklch -> linear-sRGB -> sRGB -> rgba pipeline (see the PR that
 * introduced rgba tokens, or any CSS-Color-4 tool / `culori`). Saturated colors
 * (destructive, chart-*) may sit outside the sRGB gamut and clip to the nearest
 * in-gamut rgba - flag any visible clamp in the PR. The `rgba()` values here
 * MUST stay in lock-step with `apps/mobile/global.css` (NativeWind CSS vars).
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
 * Light theme - mirrors web `:root`. rgba values are the sRGB encoding of the
 * oklch values in `apps/web/src/style.css` (derived via oklch -> sRGB -> rgba).
 */
export const lightTokens: ThemeTokens = {
  background: 'rgba(255,255,255,1)',
  foreground: 'rgba(10,10,10,1)',
  surface: 'rgba(255,255,255,1)',
  surfaceForeground: 'rgba(10,10,10,1)',
  ink: 'rgba(23,23,23,1)',
  inkForeground: 'rgba(250,250,250,1)',
  muted: 'rgba(245,245,245,1)',
  mutedForeground: 'rgba(115,115,115,1)',
  border: 'rgba(229,229,229,1)',
  ring: 'rgba(161,161,161,1)',
  destructive: 'rgba(231,0,11,1)',
  destructiveForeground: 'rgba(250,250,250,1)',
  chart1: 'rgba(245,73,0,1)',
  chart2: 'rgba(0,150,137,1)',
  chart3: 'rgba(16,78,100,1)',
  chart4: 'rgba(255,185,0,1)',
  chart5: 'rgba(254,154,0,1)',
}

/**
 * Dark theme - mirrors web `.dark`. Dark mirrors light by lightness, per the
 * design system. rgba values are the sRGB encoding of the oklch values in
 * `apps/web/src/style.css`. `border` carries a 10% white wash (alpha baked into
 * the oklch `oklch(1 0 0 / 10%)`), preserved here as `rgba(...,0.1)`.
 */
export const darkTokens: ThemeTokens = {
  background: 'rgba(10,10,10,1)',
  foreground: 'rgba(250,250,250,1)',
  surface: 'rgba(23,23,23,1)',
  surfaceForeground: 'rgba(250,250,250,1)',
  ink: 'rgba(229,229,229,1)',
  inkForeground: 'rgba(23,23,23,1)',
  muted: 'rgba(38,38,38,1)',
  mutedForeground: 'rgba(161,161,161,1)',
  border: 'rgba(255,255,255,0.1)',
  ring: 'rgba(115,115,115,1)',
  destructive: 'rgba(255,100,103,1)',
  destructiveForeground: 'rgba(250,250,250,1)',
  chart1: 'rgba(20,71,230,1)',
  chart2: 'rgba(0,188,125,1)',
  chart3: 'rgba(254,154,0,1)',
  chart4: 'rgba(173,70,255,1)',
  chart5: 'rgba(255,32,86,1)',
}

export function getTokens(theme: ResolvedTheme): ThemeTokens {
  return theme === 'dark' ? darkTokens : lightTokens
}
