import type { ComponentProps } from 'react'
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTabTrigger } from 'expo-router/ui'
import { colors as colorsRN } from '@expense-tracker/tokens/react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/shared/config/theme'
import { FAB_SIZE, Text } from '@/shared/ui'
import { useTabBarHeightSetter } from './tab-bar-height-context'

type IconName = ComponentProps<typeof Ionicons>['name']

const TAB_ICON_SIZE = 24
const TAB_LABEL_FONT_SIZE = 10
// Central gap reserved for the floating SpeedDial FAB so no tab sits under it.
const FAB_SLOT_WIDTH = FAB_SIZE + 8

/**
 * A tab the layout wants rendered in the bar. `name` must match the `name` of
 * the `<TabTrigger>` the layout declares (hidden) inside its `<TabList>` - the
 * bar references tabs by name via `useTabTrigger`.
 */
export interface TabConfig {
  /** Matches the `name` of the `<TabTrigger>` that defines this route. */
  name: string
  label: string
  icon: IconName
  /** Stable testID for Maestro e2e (convention: `tab-<name>`). */
  testId: string
}

interface TabButtonProps extends TabConfig {
  activeColor: string
  inactiveColor: string
  /** 0-based position across the whole bar, used for the a11y label. */
  index: number
  total: number
}

/**
 * A single tab button. Press / focus / navigation state comes from the headless
 * expo-router tab context via `useTabTrigger(name)` - no manual `tabPress`
 * emission, no react-navigation descriptor plumbing. `name` references the
 * `<TabTrigger>` declared (hidden) in the layout's `<TabList>`.
 */
function TabButton({
  name,
  label,
  icon,
  testId,
  activeColor,
  inactiveColor,
  index,
  total,
}: TabButtonProps) {
  const { triggerProps } = useTabTrigger({ name })
  const focused = triggerProps.isFocused
  const color = focused ? activeColor : inactiveColor

  return (
    <Pressable
      testID={testId}
      onPress={triggerProps.onPress}
      onLongPress={triggerProps.onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={`${label}, tab, ${index + 1} of ${total}`}
      style={styles.tab}
    >
      <Ionicons name={icon} size={TAB_ICON_SIZE} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  )
}

/**
 * Bottom navigation built on expo-router's headless tab components.
 * Press/focus and navigation come from `useTabTrigger`; the tab routes
 * themselves are declared by the layout's hidden `<TabList>`. This bar holds NO
 * SpeedDial and NO transaction/domain logic - those live in
 * `(tabs)/_layout.tsx`. Colors come from design tokens; the measured height is
 * reported via context so the sibling SpeedDial can compute its `bottomOffset`
 * without hardcoding it.
 */
export function BottomTabBar({ tabs }: { tabs: readonly TabConfig[] }) {
  const setTabBarHeight = useTabBarHeightSetter()
  const { resolvedTheme } = useTheme()
  const themeColors = colorsRN[resolvedTheme]
  const insets = useSafeAreaInsets()

  const activeColor = themeColors.primary
  const inactiveColor = themeColors['muted-foreground']

  const handleLayout = (event: LayoutChangeEvent) => {
    setTabBarHeight(event.nativeEvent.layout.height)
  }

  // Split the routes around a central FAB slot: first half left, slot, then rest.
  const splitAt = Math.ceil(tabs.length / 2)

  const renderButtons = (slice: readonly TabConfig[], offset: number) =>
    slice.map((tab, i) => (
      <TabButton
        key={tab.name}
        name={tab.name}
        label={tab.label}
        icon={tab.icon}
        testId={tab.testId}
        activeColor={activeColor}
        inactiveColor={inactiveColor}
        index={offset + i}
        total={tabs.length}
      />
    ))

  return (
    <View
      onLayout={handleLayout}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: themeColors.card,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: themeColors.border,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {renderButtons(tabs.slice(0, splitAt), 0)}
      {/* Central slot reserved for the SpeedDial FAB (rendered as a sibling overlay). */}
      <View style={{ width: FAB_SLOT_WIDTH }} testID="tab-bar-fab-slot" />
      {renderButtons(tabs.slice(splitAt), splitAt)}
    </View>
  )
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  label: {
    fontSize: TAB_LABEL_FONT_SIZE,
  },
})
