// Scroll-driven footer visibility for the cashflow list sheets: scrolling
// down deliberately hides the "new transaction" pill, scrolling back up
// reveals it. Returns an animated scroll handler plus the shared
// translateY the footer renders with.

import { useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated'

/** Scroll delta (px) that counts as a deliberate direction change. */
const SCROLL_DIRECTION_THRESHOLD = 8
/** How far the footer pill travels when hiding (its height + margin). */
const FOOTER_HIDE_TRANSLATE = 200
const FOOTER_ANIMATION_DURATION = 180

export function useSheetFooterScroll() {
  const previousScrollY = useSharedValue(0)
  const buttonTranslationY = useSharedValue(0)

  const scrollHandler = useAnimatedScrollHandler((event) => {
    const currentScrollY = event.contentOffset.y

    if (currentScrollY < 0) return

    const delta = currentScrollY - previousScrollY.value

    if (delta > SCROLL_DIRECTION_THRESHOLD) {
      buttonTranslationY.value = withTiming(FOOTER_HIDE_TRANSLATE, {
        duration: FOOTER_ANIMATION_DURATION,
      })
    } else if (delta < -SCROLL_DIRECTION_THRESHOLD) {
      buttonTranslationY.value = withTiming(0, {
        duration: FOOTER_ANIMATION_DURATION,
      })
    }

    previousScrollY.value = currentScrollY
  })

  return { scrollHandler, buttonTranslationY }
}
