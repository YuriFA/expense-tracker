import { Text } from '@/shared/ui/text'
import { Icon } from '@/shared/ui/icon'
import { Pressable } from '@/shared/ui/pressable'
import { View } from 'react-native'

interface CategoryRowProps {
  categoryId: string
  name: string
  icon: string
  color: string
  amountText: string
  onPress: (categoryId: string) => void
}

export function CategoryRow({
  categoryId,
  name,
  icon,
  color,
  amountText,
  onPress,
}: CategoryRowProps) {
  return (
    <Pressable
      testID={`home-category-${categoryId}`}
      accessibilityRole="button"
      accessibilityLabel={`Расходы на ${name}`}
      className="active:opacity-70"
      onPress={() => onPress(categoryId)}
    >
      <View className="flex-row items-center gap-2 py-1">
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: color }}
        >
          <Icon name={icon} size={20} color="#FFFFFF" />
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
