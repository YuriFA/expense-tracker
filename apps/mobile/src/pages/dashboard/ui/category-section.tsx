import { Card } from '@/shared/ui/card'
import { Icon, type IconName } from '@/shared/ui/icon'
import { Pressable } from '@/shared/ui/pressable'
import { Text } from '@/shared/ui/text'
import type { Category, Transaction } from '@expense-tracker/api'
import { formatAmount } from '../model/format'
import { categoryBreakdown, MonthCursor } from '../model/selectors'
import { NewCategorySheet } from './new-category-sheet'
import { useRef, useState } from 'react'
import { BottomSheetRef } from '@/shared/ui/bottom-sheet'
import { CategoryRow } from './category-row'
import { View } from 'react-native'
import { CategoryExpensesSheet } from './category-expenses-sheet'

export interface CategorySectionProps {
  cursor: MonthCursor
  transactions: Transaction[]
  categories: Category[]
}

export function CategorySection({ cursor, transactions, categories }: CategorySectionProps) {
  const expensesSheetRef = useRef<BottomSheetRef>(null)
  const newCategorySheetRef = useRef<BottomSheetRef>(null)
  const [categoryExpensesId, setCategoryExpensesId] = useState<string | undefined>(undefined)

  const hasAnyCategories = categories.length > 0
  const sheetCategory = categoryExpensesId
    ? categories.find((c) => c.id === categoryExpensesId)
    : undefined

  const rows = categoryBreakdown(transactions, categories, cursor)

  const openNewCategory = () => {
    newCategorySheetRef.current?.present()
  }

  return (
    <>
      <Card variant="elevated">
        <View className="gap-4">
          <Pressable
            testID="home-new-category"
            accessibilityRole="button"
            accessibilityLabel="Новая категория"
            onPress={openNewCategory}
          >
            <View className="flex-row items-center gap-2">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Icon name="add" size={24} colorClassName="accent-foreground" />
              </View>
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
              <Text variant="body-sm" className="text-muted-foreground">
                Создайте первую категорию, чтобы записывать расходы
              </Text>
            </View>
          ) : rows.length === 0 ? (
            <Text variant="body-sm" className="text-muted-foreground">
              В этом месяце расходов нет
            </Text>
          ) : (
            <View className="gap-6">
              {rows.map(({ category, totalMinor }) => (
                <CategoryRow
                  key={category.id}
                  categoryId={category.id}
                  name={category.name}
                  icon={category.icon as IconName}
                  color={category.color}
                  amountText={formatAmount(totalMinor)}
                  onPress={(categoryId) => {
                    setCategoryExpensesId(categoryId)
                    expensesSheetRef.current?.present()
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </Card>

      <NewCategorySheet ref={newCategorySheetRef} />

      <CategoryExpensesSheet
        ref={expensesSheetRef}
        category={sheetCategory}
        categories={categories}
        initialCursor={cursor}
        emptyText="В этом месяце расходов нет"
      />
    </>
  )
}
