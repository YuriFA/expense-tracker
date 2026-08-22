import { useCallback } from 'react'
import { StyleSheet, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { useRouter } from 'expo-router'
import Animated, {
  Extrapolation,
  clamp,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated'
import { IconButton } from '@/shared/ui/icon-button'
import { Text } from '@/shared/ui/text'
import {
  BAR_BACKGROUND_RANGE,
  BAR_BLUR_INTENSITY,
  COMPACT_BAR_HEIGHT,
  COMPACT_TITLE_RANGE,
  COMPACT_TITLE_TRANSLATE,
  LARGE_TITLE_FADE_RANGE,
  LARGE_TITLE_ZONE,
} from './constants'
import { useScreenHeaderScroll } from './screen-header-context'

export interface ScreenHeaderProps {
  /** Screen title: large at rest, compact in the bar once collapsed. */
  title: string
  /** Whether to show the back affordance in the compact bar. @default true */
  showBack?: boolean
  /** Back handler; defaults to the router's `back()`. */
  onBack?: () => void
  /** Optional bar action on the trailing side (fixed 40px slot). */
  right?: React.ReactNode
}

/**
 * Collapsible large-title header for stack (non-tab) destinations, in the
 * spirit of the iOS large title but fully cross-platform. Rendered as an
 * overlay sibling of the screen's scroll body - it takes no layout space:
 *
 * ```tsx
 * <Screen topInset={false}>
 *   <ScreenHeader title="Счета" right={…} />
 *   <ScreenScrollView>…</ScreenScrollView>
 * </Screen>
 * ```
 *
 * `Screen` hosts the scroll wiring (ScreenHeaderScrollProvider) that the
 * header and the Screen* scroll container share; the scroll offset drives
 * the collapse on the UI thread. Native navigation headers stay hidden
 * (`headerShown: false` on the root Stack).
 *
 * The component knows nothing about domain screens - it renders the given
 * `title`/`right` and animates from the shared scroll offset.
 */
export function ScreenHeader({ title, showBack = true, onBack, right }: ScreenHeaderProps) {
  const router = useRouter()
  const { scrollY, collapsed, topInset } = useScreenHeaderScroll()
  const progress = useDerivedValue(() => clamp(scrollY.value / LARGE_TITLE_ZONE, 0, 1))

  const handleBack = useCallback(() => {
    if (onBack) onBack()
    else router.back()
  }, [onBack, router])

  // The large title moves 1:1 with the scroll (pinned to the content) and
  // fades as it slides under the compact bar - that motion continuity is what
  // makes the two title nodes read as a single title.
  const largeTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, LARGE_TITLE_FADE_RANGE, [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: -clamp(scrollY.value, 0, LARGE_TITLE_ZONE) }],
  }))

  const compactTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, COMPACT_TITLE_RANGE, [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          COMPACT_TITLE_RANGE,
          [COMPACT_TITLE_TRANSLATE, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }))

  const barBackgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, BAR_BACKGROUND_RANGE, [0, 1], Extrapolation.CLAMP),
  }))

  return (
    <>
      {/* Large title: scrolls away with the content, passing under the bar. */}
      <Animated.View
        testID="screen-header-large-title"
        className="absolute left-0 right-0 top-0 z-10"
        style={largeTitleStyle}
        pointerEvents="none"
        accessibilityElementsHidden={collapsed}
        importantForAccessibility={collapsed ? 'no-hide-descendants' : 'auto'}
      >
        <View style={{ height: topInset + COMPACT_BAR_HEIGHT }} />
        <Text variant="display" className="px-6 pt-3" numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      </Animated.View>

      {/* Compact bar: fixed; its frosted background fades in as content slides under. */}
      <View testID="screen-header" className="absolute left-0 right-0 top-0 z-20">
        <Animated.View style={[StyleSheet.absoluteFill, barBackgroundStyle]} pointerEvents="none">
          <BlurView
            intensity={BAR_BLUR_INTENSITY}
            tint="light"
            blurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View
          className="flex-row items-center px-4"
          style={{ height: topInset + COMPACT_BAR_HEIGHT, paddingTop: topInset }}
        >
          {showBack ? (
            <IconButton
              className="bg-brand-indigo/10 size-10 rounded-full items-center justify-center"
              testID="screen-header-back"
              icon="chevron-back"
              accessibilityLabel="Назад"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={handleBack}
            />
          ) : (
            <View className="w-10" />
          )}
          <Animated.View
            testID="screen-header-compact-title"
            className="flex-1 items-center justify-center px-2"
            style={compactTitleStyle}
            pointerEvents="none"
            accessibilityElementsHidden={!collapsed}
            importantForAccessibility={collapsed ? 'auto' : 'no-hide-descendants'}
          >
            <Text variant="body" className="text-lg font-semibold" numberOfLines={1}>
              {title}
            </Text>
          </Animated.View>
          {right ? <View className="w-10 items-center justify-center">{right}</View> : null}
        </View>
      </View>
    </>
  )
}
