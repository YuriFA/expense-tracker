import { Pressable, View } from 'react-native'
import { Icon, Text } from '@/shared/ui'
import { useRouter } from 'expo-router'

export type QuickActionId = 'accounts' | 'income' | 'goals'

export function QuickActionsRow() {
  const router = useRouter()

  // TODO(i18n): RU labels are hardcoded until react-i18next is wired.
  const ACTIONS: ReadonlyArray<{
    id: QuickActionId
    label: string
    icon: string
    color: string
    onPress: () => void
  }> = [
    {
      id: 'accounts',
      label: 'Счета',
      icon: 'card',
      color: '#6366F1',
      onPress: () => router.push('/accounts'),
    },
    {
      id: 'income',
      label: 'Доходы',
      icon: 'trending-up',
      color: '#F97316',
      onPress: () => router.push('/income'),
    },
    {
      id: 'goals',
      label: 'Цели',
      icon: 'flag',
      color: '#22C55E',
      onPress: () => router.push('/goals'),
    },
  ]

  return (
    <View className="flex-row gap-4 justify-between">
      {ACTIONS.map((action) => (
        <Pressable
          key={action.id}
          testID={`home-quick-${action.id}`}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          className="items-center gap-1 active:opacity-70"
          onPress={action.onPress}
        >
          <View
            className="h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: action.color }}
          >
            <Icon name={action.icon} size={24} color="#FFFFFF" />
          </View>
          <Text variant="body-sm">{action.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}
