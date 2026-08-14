import { Pressable, View } from 'react-native'
import { Button, Card, Icon, Row, Stack, Text } from '@/shared/ui'
import { formatAmount } from '../model/format'
import type { CategorySpend } from '../model/selectors'

export interface CategorySectionProps {
  rows: CategorySpend[]
  /** False when the user has no categories at all (vs none with spending). */
  hasAnyCategories: boolean
  onNewCategory: () => void
  onCategoryPress: (categoryId: string) => void
}

/**
 * White rounded block: the "Новая категория" entry first, then the period's
 * expense totals per category, ordered by amount descending. Selecting a
 * category opens its filtered expense list (bottom sheet).
 */
export function CategorySection(props: CategorySectionProps) {
  const { rows, hasAnyCategories, onNewCategory, onCategoryPress } = props

  return (
    <Card variant="default">
      <Stack gap="md">
        <Pressable
          testID="home-new-category"
          accessibilityRole="button"
          accessibilityLabel="Новая категория"
          className="active:opacity-70"
          onPress={onNewCategory}
        >
          <Row align="center" gap="sm">
            <Icon name="add-circle" size={22} color="#7C5CFF" />
            <Text variant="body" className="font-medium text-foreground">
              Новая категория
            </Text>
          </Row>
        </Pressable>

        {!hasAnyCategories ? (
          <Stack gap="sm">
            <Text variant="body-sm" className="text-muted-foreground">
              Нет категорий
            </Text>
            <Button variant="primary" text="Создать категорию" onPress={onNewCategory} />
          </Stack>
        ) : rows.length === 0 ? (
          <Text variant="body-sm" className="text-muted-foreground">
            В этом месяце расходов нет
          </Text>
        ) : (
          <Stack gap="md">
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
          </Stack>
        )}
      </Stack>
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
      <Row align="center" gap="md">
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
      </Row>
    </Pressable>
  )
}
