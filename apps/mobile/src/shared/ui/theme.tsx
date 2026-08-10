import { createContext, useContext } from 'react'
import { getTokens, type ThemeTokens } from '@shared/config/theme-tokens'
import type { ResolvedTheme } from '@shared/config/settings'

interface ThemeContextValue {
  /** Effective theme after resolving a `'system'` preference. */
  resolved: ResolvedTheme
  /** Token map for the resolved theme. */
  tokens: ThemeTokens
}

/**
 * Theme context. Components consume **tokens** (not raw color strings) so the
 * palette stays centralized and the twin matches the web design system exactly.
 * The provider (app/providers/ThemeProvider) resolves the user's preference
 * against the OS color scheme and fills this context.
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) {
    throw new Error('useTheme must be used within <ThemeProvider>.')
  }
  return value
}

/** Convenience accessor for just the token map (the common case in components). */
export function useTokens(): ThemeTokens {
  return useTheme().tokens
}

export function makeThemeValue(resolved: ResolvedTheme): ThemeContextValue {
  return { resolved, tokens: getTokens(resolved) }
}
