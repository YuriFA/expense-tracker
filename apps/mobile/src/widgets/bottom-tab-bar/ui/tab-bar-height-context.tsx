import { createContext, useContext, useState, type ReactNode } from 'react'

/**
 * Shares the measured bottom-tab-bar height with the SpeedDial overlay, which
 * is rendered as a sibling of the navigator in `(tabs)/_layout.tsx`. The
 * navigator's own `useBottomTabBarHeight()` is only provided to *screens* (the
 * navigator holds the state), so a sibling overlay at the layout layer can't
 * read it. `BottomTabBar` also reports the same value to the navigator's own
 * context so `useBottomTabBarHeight()` stays accurate inside screens.
 */
const TabBarHeightContext = createContext<number>(0)
const TabBarHeightSetterContext = createContext<((height: number) => void) | undefined>(undefined)

export function TabBarHeightProvider({ children }: { children: ReactNode }) {
  const [height, setHeight] = useState(0)
  return (
    <TabBarHeightSetterContext.Provider value={setHeight}>
      <TabBarHeightContext.Provider value={height}>{children}</TabBarHeightContext.Provider>
    </TabBarHeightSetterContext.Provider>
  )
}

/** The measured tab-bar height (0 until the bar lays out). */
export function useTabBarHeight(): number {
  return useContext(TabBarHeightContext)
}

/** Setter the BottomTabBar calls from its `onLayout`. Throws if used outside the provider. */
export function useTabBarHeightSetter(): (height: number) => void {
  const setter = useContext(TabBarHeightSetterContext)
  if (!setter) {
    throw new Error('useTabBarHeightSetter must be used within <TabBarHeightProvider>')
  }
  return setter
}
