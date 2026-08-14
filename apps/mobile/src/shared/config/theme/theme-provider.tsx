import { useEffect, useState } from 'react'
import { useColorScheme } from 'react-native'
import { Uniwind } from 'uniwind'
import { ThemeContext, type Theme } from './theme-context'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme()
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(
    defaultTheme === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : defaultTheme,
  )

  useEffect(() => {
    if (theme === 'system') {
      setResolvedTheme(systemColorScheme === 'dark' ? 'dark' : 'light')
    } else {
      setResolvedTheme(theme)
    }
  }, [theme, systemColorScheme])

  // Drive Uniwind's theme ('light'/'dark' are built in, 'system' follows the
  // OS). This replaces the old document.documentElement class toggle and makes
  // setTheme work on native, not just web.
  useEffect(() => {
    Uniwind.setTheme(theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
