import { View } from 'react-native'
import { Text } from '@/shared/ui/text'
import { Icon } from '@/shared/ui/icon'
import { Pressable } from '@/shared/ui/pressable'
import { cn } from '@/shared/lib/utils'
import type { DebtorBalanceView } from '../model/selectors'

// Brand accent tokens - vivid pops from the shared palette, hashed from the
// debtor id (no stored color: zero sync cost).
const AVATAR_COLORS = [
  'bg-brand-indigo',
  'bg-brand-violet',
  'bg-brand-lilac',
  'bg-brand-orange',
  'bg-brand-green',
  'bg-brand-leaf',
] as const

function avatarColorClass(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function DebtorRow({ view, onPress }: { view: DebtorBalanceView; onPress: () => void }) {
  return (
    <Pressable
      testID={`debts-debtor-${view.debtor.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${view.debtor.name}, ${view.balanceText}`}
      className="flex-row items-center gap-3 py-3 active:opacity-70"
      onPress={onPress}
    >
      <View
        className={cn(
          'size-10 items-center justify-center rounded-full',
          avatarColorClass(view.debtor.id),
        )}
      >
        <Text variant="label" className="font-semibold text-primary-foreground">
          {initialsOf(view.debtor.name)}
        </Text>
      </View>
      <Text variant="body" className="flex-1 text-foreground" numberOfLines={1}>
        {view.debtor.name}
      </Text>
      <Text
        variant="body"
        className={cn('font-medium', view.balance < 0 ? 'text-destructive' : 'text-foreground')}
      >
        {view.balanceText}
      </Text>
      <Icon name="chevron-forward" size={16} colorClassName="accent-muted-foreground" />
    </Pressable>
  )
}
