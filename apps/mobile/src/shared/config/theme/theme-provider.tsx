import { useEffect } from 'react'
import { Uniwind } from 'uniwind'

type Theme = 'light' | 'dark' | 'system'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
}

/**
 * Drives Uniwind's theme ('light'/'dark' are built in; 'system' follows the
 * OS). Components never read theme values from here - they use token classes
 * (`bg-card`) and `accent-*` prop classes, which follow the active theme
 * automatically. A runtime theme switcher can grow a context here later.
 */
export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  useEffect(() => {
    Uniwind.setTheme(defaultTheme)
  }, [defaultTheme])

  return <>{children}</>
}
