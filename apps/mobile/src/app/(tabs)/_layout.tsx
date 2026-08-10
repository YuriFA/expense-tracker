import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useTokens } from '@shared/ui'

const APP_TITLE = 'Expense Tracker'

/**
 * Bottom tab bar - the single level of navigation (design section 7): Home,
 * Transactions, Accounts, Settings. Home is the default/active tab. One level
 * of depth only; secondary actions later use bottom sheets, not nested stacks.
 * The bar respects the bottom safe-area inset and is themed from the token map.
 */
export default function TabsLayout() {
  const { t } = useTranslation()
  const tokens = useTokens()

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTintColor: tokens.foreground,
        headerStyle: { backgroundColor: tokens.background },
        headerTitleStyle: { fontFamily: 'Outfit-SemiBold' },
        tabBarActiveTintColor: tokens.ink,
        tabBarInactiveTintColor: tokens.mutedForeground,
        tabBarStyle: {
          backgroundColor: tokens.background,
          borderTopColor: tokens.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontFamily: 'Outfit', fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.dashboard'),
          headerTitle: APP_TITLE,
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('nav.transactions'),
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: t('nav.accounts'),
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('nav.settings'),
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
