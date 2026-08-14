import type { ComponentProps } from 'react'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui'
import type { Href } from 'expo-router'
import { colors as colorsRN } from '@expense-tracker/tokens/react-native'
import { useTheme } from '@/shared/config/theme'
import { FAB_SIZE, Icon, SpeedDial, type SpeedDialAction } from '@/shared/ui'
import {
  BottomTabBar,
  TabBarHeightProvider,
  useTabBarHeight,
  type TabConfig,
} from '@/widgets/bottom-tab-bar'

type IconName = ComponentProps<typeof Ionicons>['name']

interface TabDef extends TabConfig {
  /** Absolute route URL this tab switches to; drives the hidden `<TabTrigger>`. */
  href: Href
}

/**
 * Bottom-tab navigator for the authenticated app surface - the mobile twin of
 * the web top nav (apps/web/src/app/layout/AppNav.vue).
 *
 * Built on expo-router's headless tab components (`expo-router/ui`): the hidden
 * `<TabList>` declares the routes, `<TabSlot>` renders the focused screen, and
 * the custom `<BottomTabBar>` renders the visible buttons (reading focus/press
 * state via `useTabTrigger`). This keeps the whole tab surface first-party
 * expo-router, with no `@react-navigation/bottom-tabs` `BottomTabBarProps`
 * plumbing.
 *
 * TODO(i18n): swap the hardcoded `label`s for the shared `@expense-tracker/i18n`
 * bundle (`nav.dashboard` etc.) once react-i18next is wired in shared/i18n.
 */
const TABS: readonly TabDef[] = [
  { name: 'index', href: '/', label: 'Dashboard', testId: 'tab-dashboard', icon: 'grid-outline' },
  { name: 'transactions', href: '/transactions', label: 'Transactions', testId: 'tab-transactions', icon: 'swap-horizontal-outline' },
  { name: 'accounts', href: '/accounts', label: 'Accounts', testId: 'tab-accounts', icon: 'wallet-outline' },
  { name: 'settings', href: '/settings', label: 'Settings', testId: 'tab-settings', icon: 'settings-outline' },
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
 * Renders the headless tab navigator and the SpeedDial overlay as siblings.
 *
 * Layering decision (spec section 9, Variant B): the SpeedDial is a fullscreen
 * overlay mounted as a SIBLING of `<Tabs>`, not inside the tab bar. Its single
 * `absoluteFill` backdrop must cover screen content, and the tab-bar slot is
 * only ~80px tall, so mounting inside it would clip the scrim. Rendered after
 * `<Tabs>`, the overlay paints above the bar: FAB + actions are topmost, the
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
      {/*
        Headless expo-router tabs (`expo-router/ui`):
          - <TabList> declares the tab routes (hidden; its <TabTrigger> children
            define the route set and build the name -> route trigger map).
          - <BottomTabBar> renders the visible buttons; each reads its focus and
            press handler from `useTabTrigger(name)`, referencing the tabs above.
          - <TabSlot> renders the focused screen.
        See https://docs.expo.dev/router/advanced/custom-tabs/.
      */}
      <Tabs>
        <TabSlot />
        <BottomTabBar tabs={TABS} />
        <TabList style={{ display: 'none' }}>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} />
          ))}
        </TabList>
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
