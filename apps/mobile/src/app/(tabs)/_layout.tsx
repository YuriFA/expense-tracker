import { View } from 'react-native'
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui'
import type { Href } from 'expo-router'
import { colors as colorsRN } from '@expense-tracker/tokens/react-native'
import { useTheme } from '@/shared/config/theme'
import { Icon } from '@/shared/ui/icon'
import { FAB_SIZE, SpeedDial, type SpeedDialAction } from '@/shared/ui/speed-dial'
import {
  BottomTabBar,
  TabBarHeightProvider,
  useTabBarHeight,
  type TabConfig,
} from '@/widgets/bottom-tab-bar'

interface TabDef extends TabConfig {
  href: Href
}

// TODO(i18n): replace the hardcoded `label`s with the shared
// @expense-tracker/i18n bundle once react-i18next is wired in shared/i18n.
const TABS: readonly TabDef[] = [
  { name: 'index', href: '/', label: 'Dashboard', testId: 'tab-dashboard', icon: 'grid-outline' },
  {
    name: 'transactions',
    href: '/transactions',
    label: 'Transactions',
    testId: 'tab-transactions',
    icon: 'swap-horizontal-outline',
  },
  {
    name: 'accounts',
    href: '/accounts',
    label: 'Accounts',
    testId: 'tab-accounts',
    icon: 'wallet-outline',
  },
  {
    name: 'settings',
    href: '/settings',
    label: 'Settings',
    testId: 'tab-settings',
    icon: 'settings-outline',
  },
] as const

// Placeholder actions - the create-transaction flows don't exist yet. Navigation
// is wired here (the layout owns routing), not in SpeedDial or BottomTabBar, to
// keep the shared SpeedDial domain-free.
function useTransactionActions(iconColor: string): SpeedDialAction[] {
  return [
    {
      id: 'transfer',
      label: 'Transfer',
      accessibilityLabel: 'Add transfer',
      icon: <Icon name="swap-horizontal" size={22} color={iconColor} />,
      size: 48,
      onPress: () => {
        // TODO(create-transaction): navigate to the create-transfer flow.
      },
    },
    {
      id: 'expense',
      label: 'Expense',
      accessibilityLabel: 'Add expense',
      icon: <Icon name="remove" size={22} color={iconColor} />,
      size: 64,
      onPress: () => {
        // TODO(create-transaction): navigate to the create-expense flow.
      },
    },
    {
      id: 'income',
      label: 'Income',
      accessibilityLabel: 'Add income',
      icon: <Icon name="add" size={22} color={iconColor} />,
      size: 48,
      onPress: () => {
        // TODO(create-transaction): navigate to the create-income flow.
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

// The SpeedDial is a fullscreen overlay mounted as a SIBLING of <Tabs>, not
// inside the tab bar: its scrim must cover the whole screen (the bar slot is
// only ~80px), and rendered after <Tabs> it paints above the bar. The FAB is
// centered and straddles the bar's top edge via bottomOffset, so opening it
// never changes the active tab - it's a floating action, not a route.
function TabsSurface() {
  const { resolvedTheme } = useTheme()
  const tabBarHeight = useTabBarHeight()
  const actions = useTransactionActions(colorsRN[resolvedTheme]['primary-foreground'])

  // Straddle the bar's top edge: FAB center at the bar top. tabBarHeight includes
  // the safe-area padding, so no separate inset is needed. Falls back to the
  // SpeedDial's safe-area default until the bar has laid out.
  const fabBottomOffset = tabBarHeight > 0 ? tabBarHeight - FAB_SIZE / 1.3 : undefined

  return (
    <View className="flex-1 bg-[#fafafa]">
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
        bottomOffset={fabBottomOffset}
        actions={actions}
        label="Add transaction"
        closeLabel="Close transaction actions"
      />
    </View>
  )
}
