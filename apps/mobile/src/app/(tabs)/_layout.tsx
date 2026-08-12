import type { ComponentProps } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'

type IconName = ComponentProps<typeof Ionicons>['name']

/**
 * Bottom-tab navigator for the authenticated app surface - the mobile twin of
 * the web top nav (apps/web/src/app/layout/AppNav.vue).
 *
 * TODO(i18n): swap the hardcoded `title`s for the shared `@expense-tracker/i18n`
 * bundle (`nav.dashboard` etc.) once react-i18next is wired in shared/i18n.
 */
const TABS = [
  { name: 'index', title: 'Dashboard', icon: 'grid-outline' as IconName },
  { name: 'transactions', title: 'Transactions', icon: 'swap-horizontal-outline' as IconName },
  { name: 'accounts', title: 'Accounts', icon: 'wallet-outline' as IconName },
  { name: 'settings', title: 'Settings', icon: 'settings-outline' as IconName },
] as const

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0a7aff',
        headerTitleAlign: 'center',
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <Ionicons name={tab.icon} size={24} color={color} />,
          }}
        />
      ))}
    </Tabs>
  )
}
