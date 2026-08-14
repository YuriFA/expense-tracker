import { Pressable, View } from 'react-native'
import { Button, Card, Icon, Text } from '@/shared/ui'
import { formatAmount } from '../model/format'
import type { CategorySpend } from '../model/selectors'

export interface CategorySectionProps {
  rows: CategorySpend[]
  /** False when the user has no categories at all (vs none with spending). */
  hasAnyCategories: boolean
  onNewCategory: () => void
  onCategoryPress: (categoryId: string) => void
}

export function CategorySection(props: CategorySectionProps) {
  const { rows, hasAnyCategories, onNewCategory, onCategoryPress } = props

  return (
    <Card variant="elevated">
      <View className="gap-4">
        <Pressable
          testID="home-new-category"
          accessibilityRole="button"
          accessibilityLabel="Новая категория"
          className="active:opacity-70"
          onPress={onNewCategory}
        >
          <View className="flex-row items-center gap-2">
            <Icon name="add-circle" size={32} color="#7C5CFF" />
            <Text variant="body" className="font-medium text-foreground">
              Новая категория
            </Text>
          </View>
        </Pressable>

        {!hasAnyCategories ? (
          <View className="gap-2">
            <Text variant="body-sm" className="text-muted-foreground">
              Нет категорий
            </Text>
            <Button variant="primary" text="Создать категорию" onPress={onNewCategory} />
          </View>
        ) : rows.length === 0 ? (
          <Text variant="body-sm" className="text-muted-foreground">
            В этом месяце расходов нет
          </Text>
        ) : (
          <View className="gap-2">
            {rows.map(({ category, totalMinor }) => (
              <CategoryRow
                key={category.id}
                categoryId={category.id}
                name={category.name}
                icon={category.icon}
                color={category.color}
                amountText={formatAmount(totalMinor)}
                onPress={onCategoryPress}
              />
            ))}
          </View>
        )}
      </View>
    </Card>
  )
}

interface CategoryRowProps {
  categoryId: string
  name: string
  icon: string
  color: string
  amountText: string
  onPress: (categoryId: string) => void
}

function CategoryRow(props: CategoryRowProps) {
  const { categoryId, name, icon, color, amountText, onPress } = props

  return (
    <Pressable
      testID={`home-category-${categoryId}`}
      accessibilityRole="button"
      accessibilityLabel={`Расходы на ${name}`}
      className="active:opacity-70"
      onPress={() => onPress(categoryId)}
    >
      <View className="flex-row items-center gap-2">
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
