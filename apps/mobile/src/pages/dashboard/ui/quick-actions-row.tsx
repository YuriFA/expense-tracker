import { Pressable, View } from 'react-native'
import { Icon, type IconName } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import { useRouter } from 'expo-router'
import { cn } from '@/shared/lib/utils'

type QuickActionId = 'accounts' | 'income' | 'goals'

export function QuickActionsRow() {
  const router = useRouter()

  // TODO(i18n): RU labels are hardcoded until react-i18next is wired.
  // Chip colors are brand accent tokens - vivid pops from the shared palette
  // (not warning/success: these are navigation shortcuts, not outcomes).
  const ACTIONS: ReadonlyArray<{
    id: QuickActionId
    label: string
    icon: IconName
    chipClassName: string
    onPress: () => void
  }> = [
    {
      id: 'accounts',
      label: 'Счета',
      icon: 'card',
      chipClassName: 'bg-brand-indigo',
      onPress: () => router.push('/accounts'),
    },
    {
      id: 'income',
      label: 'Доходы',
      icon: 'trending-up',
      chipClassName: 'bg-brand-orange',
      onPress: () => router.push('/income'),
    },
    {
      id: 'goals',
      label: 'Цели',
      icon: 'flag',
      chipClassName: 'bg-brand-green',
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
            className={cn(
              'h-16 w-16 items-center justify-center rounded-2xl',
              action.chipClassName,
            )}
          >
            <Icon name={action.icon} size={24} colorClassName="accent-white" />
          </View>
          <Text variant="body-sm">{action.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}
