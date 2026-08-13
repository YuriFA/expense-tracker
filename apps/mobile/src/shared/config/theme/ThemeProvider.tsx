import { useEffect, useState } from "react"
import { useColorScheme } from "react-native"
import { ThemeContext, type Theme } from "./ThemeContext"

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
}

export function ThemeProvider({ children, defaultTheme = "system" }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme()
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    defaultTheme === "system" ? (systemColorScheme === "dark" ? "dark" : "light") : defaultTheme
  )

  useEffect(() => {
    if (theme === "system") {
      setResolvedTheme(systemColorScheme === "dark" ? "dark" : "light")
    } else {
      setResolvedTheme(theme)
    }
  }, [theme, systemColorScheme])

  // Apply theme class to root element
  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement
      root.classList.remove("light", "dark")
      root.classList.add(resolvedTheme)
    }
  }, [resolvedTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
