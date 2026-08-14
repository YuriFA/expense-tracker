import { Pressable, View } from 'react-native'
import { Icon, Text } from '@/shared/ui'

export type QuickActionId = 'accounts' | 'income' | 'goals'

export interface QuickActionsRowProps {
  onPress: (id: QuickActionId) => void
}

// TODO(i18n): RU labels are hardcoded until react-i18next is wired.
const ACTIONS: ReadonlyArray<{ id: QuickActionId; label: string; icon: string; color: string }> = [
  { id: 'accounts', label: 'Счета', icon: 'card', color: '#6366F1' },
  { id: 'income', label: 'Доходы', icon: 'trending-up', color: '#F97316' },
  { id: 'goals', label: 'Цели', icon: 'flag', color: '#22C55E' },
]

export function QuickActionsRow(props: QuickActionsRowProps) {
  return (
    <View className="flex-row gap-3">
      {ACTIONS.map((action) => (
        <Pressable
          key={action.id}
          testID={`home-quick-${action.id}`}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          className="flex-1 items-center gap-2 active:opacity-70"
          onPress={() => props.onPress(action.id)}
        >
          <View
            className="h-14 w-14 items-center justify-center rounded-2xl"
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
