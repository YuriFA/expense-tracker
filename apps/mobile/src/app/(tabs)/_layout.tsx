import type { ComponentProps } from 'react'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { colors as colorsRN } from '@expense-tracker/tokens/react-native'
import { useTheme } from '@/shared/config/theme'
import { FAB_SIZE, Icon, SpeedDial, type SpeedDialAction } from '@/shared/ui'
import {
  BottomTabBar,
  TabBarHeightProvider,
  useTabBarHeight,
} from '@/widgets/bottom-tab-bar'

type IconName = ComponentProps<typeof Ionicons>['name']

/**
 * Bottom-tab navigator for the authenticated app surface - the mobile twin of
 * the web top nav (apps/web/src/app/layout/AppNav.vue).
 *
 * TODO(i18n): swap the hardcoded `title`s for the shared `@expense-tracker/i18n`
 * bundle (`nav.dashboard` etc.) once react-i18next is wired in shared/i18n.
 */
const TABS = [
  { name: 'index', title: 'Dashboard', testId: 'tab-dashboard', icon: 'grid-outline' as IconName },
  { name: 'transactions', title: 'Transactions', testId: 'tab-transactions', icon: 'swap-horizontal-outline' as IconName },
  { name: 'accounts', title: 'Accounts', testId: 'tab-accounts', icon: 'wallet-outline' as IconName },
  { name: 'settings', title: 'Settings', testId: 'tab-settings', icon: 'settings-outline' as IconName },
] as const

/**
 * Central SpeedDial actions. The create-transaction flows do not exist yet, so
 * the callbacks are placeholders - they close the dial (handled by SpeedDial)
 * and leave a TODO for navigation. Wiring navigation HERE (the layout that owns
 * routing), not in `shared/ui/SpeedDial` or `BottomTabBar`, keeps the shared
 * SpeedDial domain-free (spec sections 21-23).
 */
function useTransactionActions(iconColor: string): SpeedDialAction[] {
  return [
    {
      id: 'expense',
      label: 'Expense',
      accessibilityLabel: 'Add expense',
      icon: <Icon name="remove" size={22} color={iconColor} />,
      onPress: () => {
        // TODO(create-transaction): navigate to the create-expense flow.
      },
    },
    {
      id: 'income',
      label: 'Income',
      accessibilityLabel: 'Add income',
      icon: <Icon name="add" size={22} color={iconColor} />,
      onPress: () => {
        // TODO(create-transaction): navigate to the create-income flow.
      },
    },
    {
      id: 'transfer',
      label: 'Transfer',
      accessibilityLabel: 'Add transfer',
      icon: <Icon name="swap-horizontal" size={22} color={iconColor} />,
      onPress: () => {
        // TODO(create-transaction): navigate to the create-transfer flow.
      },
    },
  ]
}

export default function TabsLayout() {
  return (
    <TabBarHeightProvider>
      <TabsSurface />
    </TabBarHeightProvider>
  )
}

/**
 * Renders the tab navigator and the SpeedDial overlay as siblings.
 *
 * Layering decision (spec section 9, Variant B): the SpeedDial is a fullscreen
 * overlay mounted as a SIBLING of <Tabs>, not inside the tab bar. Its single
 * `absoluteFill` backdrop must cover screen content, and the tab-bar slot is
 * only ~80px tall, so mounting inside it would clip the scrim. Rendered after
 * <Tabs>, the overlay paints above the bar: FAB + actions are topmost, the
 * dimmed scrim blocks the whole surface (including the bar) when open, and
 * tapping the scrim closes the menu (spec section 25, option A). The FAB is
 * centered (SpeedDial `position="center"`) and straddles the bar's top edge via
 * `bottomOffset = measuredBarHeight - FAB_SIZE/2` - no hardcoded bar height
 * (spec sections 12, 19, 20). Opening the SpeedDial never changes the active
 * tab: it is a floating action control, not a route (spec sections 2, 4).
 */
function TabsSurface() {
  const { resolvedTheme } = useTheme()
  const tabBarHeight = useTabBarHeight()
  const actions = useTransactionActions(colorsRN[resolvedTheme]['primary-foreground'])

  // Straddle the bar's top edge: FAB center at the bar top -> its bottom edge is
  // half the FAB above it. `tabBarHeight` already includes the safe-area padding,
  // so no separate inset is needed. Falls back to SpeedDial's safe-area default
  // until the bar has laid out.
  const fabBottomOffset = tabBarHeight > 0 ? tabBarHeight - FAB_SIZE / 2 : undefined

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <BottomTabBar {...props} />}
        screenOptions={{ headerTitleAlign: 'center' }}
      >
        {TABS.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarButtonTestID: tab.testId,
              tabBarIcon: ({ color }) => <Ionicons name={tab.icon} size={24} color={color} />,
            }}
          />
        ))}
      </Tabs>

      <SpeedDial
        position="center"
        bottomOffset={fabBottomOffset}
        actions={actions}
        label="Add transaction"
        closeLabel="Close transaction actions"
      />
    </View>
  )
}
