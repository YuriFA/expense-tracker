import { Button, Card, Icon, Pressable, Text } from '@/shared/ui'
import { formatAmount } from '../model/format'
import { categoryBreakdown, expensesInMonth, MonthCursor, toExpenseRow } from '../model/selectors'
import { NewCategorySheet } from './new-category-sheet'
import { useRef, useState } from 'react'
import { BottomSheetRef } from '@/shared/ui/bottom-sheet'
import { ExpensesSheet } from './expenses-sheet'
import { MOCK_CATEGORIES, MOCK_TRANSACTIONS } from '../model/mock-data'
import { CategoryRow } from './category-row'
import { View } from 'react-native'

export interface CategorySectionProps {
  cursor: MonthCursor
}

export function CategorySection({ cursor }: CategorySectionProps) {
  const expensesSheetRef = useRef<BottomSheetRef>(null)
  const newCategorySheetRef = useRef<BottomSheetRef>(null)
  const [categoryExpensesId, setCategoryExpensesId] = useState<string | undefined>(undefined)

  const hasAnyCategories = MOCK_CATEGORIES.length > 0
  const sheetCategory = categoryExpensesId
    ? MOCK_CATEGORIES.find((c) => c.id === categoryExpensesId)
    : undefined

  const rows = categoryBreakdown(MOCK_TRANSACTIONS, MOCK_CATEGORIES, cursor)
  const sheetRows = categoryExpensesId
    ? expensesInMonth(MOCK_TRANSACTIONS, cursor)
        .filter((t) => t.categoryId === categoryExpensesId)
        .map((t) => toExpenseRow(t, MOCK_CATEGORIES))
    : expensesInMonth(MOCK_TRANSACTIONS, cursor).map((t) => toExpenseRow(t, MOCK_CATEGORIES))

  const handleAddCategory = () => {
    // TODO: Implement adding a new category to the list. This is a placeholder for now.
  }

  return (
    <>
      <Card variant="elevated">
        <View className="gap-4">
          <Pressable
            testID="home-new-category"
            accessibilityRole="button"
            accessibilityLabel="Новая категория"
            onPress={() => {
              newCategorySheetRef.current?.present()
            }}
          >
            <View className="flex-row items-center gap-2">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-300">
                <Icon name="add" size={24} color="#000000" />
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
              <Button variant="primary" text="Создать категорию" onPress={handleAddCategory} />
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
                  icon={category.icon}
                  color={category.color}
                  amountText={formatAmount(totalMinor)}
                  onPress={() => {
                    setCategoryExpensesId(category.id)
                    expensesSheetRef.current?.present()
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </Card>

      <NewCategorySheet ref={newCategorySheetRef} onSubmit={handleAddCategory} />

      <ExpensesSheet
        ref={expensesSheetRef}
        title={sheetCategory?.name ?? 'Категория'}
        rows={sheetRows}
        emptyText="В этом месяце расходов нет"
      />
    </>
  )
}
