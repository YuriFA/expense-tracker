import { Text } from '@/shared/ui/text'
import { Icon, type IconName } from '@/shared/ui/icon'
import { Pressable } from '@/shared/ui/pressable'
import { View } from 'react-native'
import { cn } from '@/shared/lib/utils'
import { CASHFLOW_KIND_VIEWS } from './kind'
import type { CashflowKind } from '../model/selectors'

interface CategoryRowProps {
  kind: CashflowKind
  categoryId: string
  name: string
  icon: IconName
  /** Data color (hex from the category record); falls back to `bg-muted`. */
  color: string | undefined
  amountText: string
  onPress: (categoryId: string) => void
}

export function CategoryRow({
  kind,
  categoryId,
  name,
  icon,
  color,
  amountText,
  onPress,
}: CategoryRowProps) {
  const { copy, ids } = CASHFLOW_KIND_VIEWS[kind]

  return (
    <Pressable
      testID={`${ids.categoryRow}-${categoryId}`}
      accessibilityRole="button"
      accessibilityLabel={copy.categoryRowA11yLabel(name)}
      className="active:opacity-70"
      onPress={() => onPress(categoryId)}
    >
      <View className="flex-row items-center gap-2 py-1">
        <View
          className={cn(
            'h-10 w-10 items-center justify-center rounded-full',
            color ? undefined : 'bg-muted',
          )}
          style={color ? { backgroundColor: color } : undefined}
        >
          <Icon name={icon} size={20} colorClassName="accent-white" />
        </View>
        <Text variant="body" className="flex-1 text-foreground">
          {name}
        </Text>
        <Text variant="body" className="font-semibold text-foreground">
          {amountText}
        </Text>
      </View>
    </Pressable>
  )
}
