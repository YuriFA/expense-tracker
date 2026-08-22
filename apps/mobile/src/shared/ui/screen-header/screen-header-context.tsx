import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  SharedValue,
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated'
import { COMPACT_BAR_HEIGHT, LARGE_TITLE_ZONE } from './constants'

/** The scroll handler type the provider produces and the wrapper attaches. */
export type ScreenHeaderScrollHandler = ReturnType<typeof useAnimatedScrollHandler>

/** Scroll wiring that ScreenHeader and the Screen* scroll wrappers share. */
export interface ScreenHeaderScroll {
  /** Animated scroll offset of the screen's scroll container. */
  scrollY: SharedValue<number>
  scrollHandler: ScreenHeaderScrollHandler
  /** Whether the scroll passed the collapse threshold (gates title a11y). */
  collapsed: boolean
  /** Top safe-area inset; on header screens the header owns it. */
  topInset: number
  /** paddingTop for the scroll content so it starts below the expanded header. */
  contentPaddingTop: number
  /** Top inset for the iOS scroll indicator so it starts below the compact bar. */
  indicatorTopInset: number
}

const ScreenHeaderScrollContext = createContext<ScreenHeaderScroll | undefined>(undefined)

/**
 * Hosts the ScreenHeader scroll wiring so a stack screen can compose
 * `<ScreenHeader>` and its Screen* scroll container as plain siblings:
 * `Screen` mounts this provider and both consume from it. Creates the scroll
 * shared value, the collapse-threshold state, and the content metrics
 * derived from the safe area - screens and the header itself never wire
 * these by hand.
 */
export function ScreenHeaderScrollProvider({ children }: { children: ReactNode }) {
  const { top: topInset } = useSafeAreaInsets()
  const [collapsed, setCollapsed] = useState(false)
  const scrollY = useSharedValue(0)

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y

    // One state flip per threshold crossing - never per scroll event. The
    // worklet is rebuilt when `collapsed` changes (Reanimated tracks the
    // closure), so the comparison always sees the current state.
    const next = event.contentOffset.y >= LARGE_TITLE_ZONE
    if (next !== collapsed) {
      runOnJS(setCollapsed)(next)
    }
  })

  const value = useMemo(
    () => ({
      scrollY,
      scrollHandler,
      collapsed,
      topInset,
      contentPaddingTop: topInset + COMPACT_BAR_HEIGHT + LARGE_TITLE_ZONE,
      indicatorTopInset: topInset + COMPACT_BAR_HEIGHT,
    }),
    [scrollY, scrollHandler, collapsed, topInset],
  )

  return (
    <ScreenHeaderScrollContext.Provider value={value}>
      {children}
    </ScreenHeaderScrollContext.Provider>
  )
}

/** The parent Screen's ScreenHeader scroll wiring. Throws outside a Screen. */
export function useScreenHeaderScroll(): ScreenHeaderScroll {
  const value = useContext(ScreenHeaderScrollContext)
  if (!value) {
    throw new Error('useScreenHeaderScroll must be used within a <Screen>')
  }
  return value
}
