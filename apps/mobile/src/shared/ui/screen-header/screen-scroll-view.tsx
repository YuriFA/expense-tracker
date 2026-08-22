import { ScrollView, type ScrollViewProps } from 'react-native'
import Animated from 'react-native-reanimated'
import { useScreenHeaderScroll } from './screen-header-context'
import { cn } from '@/shared/lib/utils'

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView)

/**
 * ScrollView wired to the parent ScreenHeader: reports the scroll offset that
 * drives the header's collapse and pads the content below the expanded
 * header, so screens never handle header metrics or safe areas themselves.
 * The header owns `onScroll` - do not pass your own. A screen uses exactly one
 * Screen* scroll container inside its ScreenHeader.
 */
export function ScreenScrollView(props: ScrollViewProps) {
  const { scrollHandler, contentPaddingTop, indicatorTopInset } = useScreenHeaderScroll()

  return (
    <AnimatedScrollView
      {...props}
      className={cn('flex-1 pb-safe', props.className)}
      onScroll={scrollHandler}
      contentContainerStyle={[{ paddingTop: contentPaddingTop }, props.contentContainerStyle]}
      scrollIndicatorInsets={{ top: indicatorTopInset }}
    />
  )
}
