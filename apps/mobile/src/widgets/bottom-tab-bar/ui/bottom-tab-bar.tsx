import type { ComponentProps } from 'react'
import { Pressable, View, type LayoutChangeEvent } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTabTrigger } from 'expo-router/ui'
import { FAB_SIZE } from '@/shared/ui/speed-dial'
import { Icon } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import { useTabBarHeightSetter } from './tab-bar-height-context'
import { cn } from '@/shared/lib/utils'

type IconName = ComponentProps<typeof Ionicons>['name']

const TAB_ICON_SIZE = 20
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
function TabButton({ name, label, icon, testId, index, total }: TabButtonProps) {
  const { triggerProps } = useTabTrigger({ name })
  const focused = triggerProps.isFocused

  return (
    <Pressable
      testID={testId}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={`${label}, tab, ${index + 1} of ${total}`}
      className={cn('flex-1 items-center justify-center py-2 gap-1 rounded-3xl', {
        'bg-muted': focused,
      })}
      onPress={triggerProps.onPress}
      onLongPress={triggerProps.onLongPress}
    >
      <Icon
        name={icon}
        size={TAB_ICON_SIZE}
        colorClassName={focused ? 'accent-primary' : 'accent-muted-foreground'}
      />
      <Text variant="caption" className={focused ? 'text-primary' : 'text-muted-foreground'}>
        {label}
      </Text>
    </Pressable>
  )
}

/**
 * Bottom navigation built on expo-router's headless tab components.
 * Press/focus and navigation come from `useTabTrigger`; the tab routes
 * themselves are declared by the layout's hidden `<TabList>`. This bar holds NO
 * SpeedDial and NO transaction/domain logic - those live in
 * `(tabs)/_layout.tsx`. Colors come from design-token classes (theme-aware);
 * the measured height is reported via context so the sibling SpeedDial can
 * compute its `bottomOffset` without hardcoding it.
 */
export function BottomTabBar({ tabs }: { tabs: readonly TabConfig[] }) {
  const setTabBarHeight = useTabBarHeightSetter()

  const handleLayout = (event: LayoutChangeEvent) => {
    setTabBarHeight(event.nativeEvent.layout.height)
  }

  // Split the routes around a central FAB slot: first half left, slot, then rest.
  const splitAt = Math.ceil(tabs.length / 2)

  const renderButtons = (slice: readonly TabConfig[], offset: number) =>
    slice.map((tab, i) => (
      <TabButton key={tab.name} {...tab} index={offset + i} total={tabs.length} />
    ))

  return (
    <View className="pb-safe px-safe" onLayout={handleLayout}>
      <View className="flex flex-row bg-background mx-2 rounded-4xl p-1.5">
        {renderButtons(tabs.slice(0, splitAt), 0)}
        {/* Central slot reserved for the SpeedDial FAB (rendered as a sibling overlay). */}
        <View style={{ width: FAB_SLOT_WIDTH }} testID="tab-bar-fab-slot" />
        {renderButtons(tabs.slice(splitAt), splitAt)}
      </View>
    </View>
  )
}
