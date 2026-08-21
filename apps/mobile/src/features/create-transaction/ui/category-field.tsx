import { useRef } from 'react'
import { useController, useFormContext } from 'react-hook-form'
import { View } from 'react-native'
import { useCategories } from '@/entities/category'
import type { BottomSheetRef } from '@/shared/ui/bottom-sheet'
import { Text } from '@/shared/ui/text'
import type { CreateTransactionFormValues } from '../model/schema'
import { CategoryPickerSheet } from './category-picker-sheet'
import { CategoryQuickBar } from './category-quick-bar'

/**
 * The expense/income category section: the quick bar and its "all categories"
 * sheet. Owns the categoryId subscription and the flow's categories query;
 * category picks never re-render the rest of the form.
 */
export function CategoryField({ kind }: { kind: 'expense' | 'income' }) {
  const { control, setValue } = useFormContext<CreateTransactionFormValues>()
  const { field } = useController({ name: 'categoryId', control })
  const categories = useCategories(kind).data ?? []
  const pickerRef = useRef<BottomSheetRef>(null)

  const handleSelect = (id: string) => setValue('categoryId', id, { shouldValidate: true })

  return (
    <View className="gap-2">
      <CategoryQuickBar
        categories={categories}
        selectedId={field.value ?? ''}
        onSelect={handleSelect}
        onOpenMenu={() => pickerRef.current?.present()}
      />
      {categories.length === 0 ? (
        <Text variant="caption" className="text-muted-foreground">
          Нет категорий этого типа - создайте категорию на главном экране
        </Text>
      ) : null}
      <CategoryPickerSheet
        ref={pickerRef}
        categories={categories}
        selectedId={field.value ?? ''}
        onSelect={handleSelect}
      />
    </View>
  )
}
