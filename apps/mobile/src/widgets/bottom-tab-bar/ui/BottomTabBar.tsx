import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native"
import type { BottomTabBarProps } from "expo-router/js-tabs"
import { colors as colorsRN } from "@expense-tracker/tokens/react-native"
import { useTheme } from "@/shared/config/theme"
import { FAB_SIZE, Text } from "@/shared/ui"
import { useTabBarHeightSetter } from "./tab-bar-height-context"

const TAB_ICON_SIZE = 24
const TAB_LABEL_FONT_SIZE = 10
// Central gap reserved for the floating SpeedDial FAB so no tab sits under it.
const FAB_SLOT_WIDTH = FAB_SIZE + 8

/**
 * BottomTabBar - the mobile bottom navigation, composed of the real tab routes
 * with a central reserved slot for the SpeedDial FAB.
 *
 * Pure composition + navigation only: it renders the tab buttons (icons,
 * labels, active/inactive state, accessibility, navigation) and reserves the
 * central space for the FAB. It contains NO SpeedDial and NO transaction/domain
 * logic - those live in `(tabs)/_layout.tsx`, the consumer that owns navigation
 * (spec sections 7, 21-23). The FAB itself is rendered as a sibling overlay by
 * the layout, not here.
 *
 * Colors come from design tokens (never hardcoded). The measured height is
 * reported to this widget's height context so the sibling SpeedDial overlay can
 * compute its `bottomOffset` without hardcoding the bar height. (The navigator's
 * own `useBottomTabBarHeight()`, read inside screens, keeps using its built-in
 * estimate - close enough for the skeleton; wiring the navigator callback would
 * require importing expo-router's runtime, which is not jest-safe here.)
 */
export function BottomTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const setTabBarHeight = useTabBarHeightSetter()
  const { resolvedTheme } = useTheme()
  const themeColors = colorsRN[resolvedTheme]

  const focusedDescriptor = descriptors[state.routes[state.index]?.key]
  const focusedOptions = focusedDescriptor?.options ?? {}
  const activeColor = focusedOptions.tabBarActiveTintColor ?? themeColors.primary
  const inactiveColor = focusedOptions.tabBarInactiveTintColor ?? themeColors["muted-foreground"]

  const handleLayout = (event: LayoutChangeEvent) => {
    setTabBarHeight(event.nativeEvent.layout.height)
  }

  // Split the routes around a central FAB slot: first half left, slot, then rest.
  const splitAt = Math.ceil(state.routes.length / 2)

  const renderTab = (route: (typeof state.routes)[number], globalIndex: number) => {
    const { options } = descriptors[route.key]
    const focused = state.index === globalIndex
    const color = focused ? activeColor : inactiveColor
    const label = typeof options.tabBarLabel === "string" ? options.tabBarLabel : options.title
    const icon = options.tabBarIcon?.({ focused, color, size: TAB_ICON_SIZE })

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      })
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params)
      }
    }
    const onLongPress = () => {
      navigation.emit({ type: "tabLongPress", target: route.key })
    }

    return (
      <Pressable
        key={route.key}
        testID={options.tabBarButtonTestID}
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={
          label ? `${label}, tab, ${globalIndex + 1} of ${state.routes.length}` : undefined
        }
        style={styles.tab}
      >
        {icon ?? null}
        {label ? <Text style={[styles.label, { color }]}>{label}</Text> : null}
      </Pressable>
    )
  }

  return (
    <View
      onLayout={handleLayout}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: themeColors.card,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: themeColors.border,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {state.routes.slice(0, splitAt).map((route, i) => renderTab(route, i))}
      {/* Central slot reserved for the SpeedDial FAB (rendered as a sibling overlay). */}
      <View style={{ width: FAB_SLOT_WIDTH }} testID="tab-bar-fab-slot" />
      {state.routes.slice(splitAt).map((route, i) => renderTab(route, i + splitAt))}
    </View>
  )
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 2,
  },
  label: {
    fontSize: TAB_LABEL_FONT_SIZE,
  },
})
