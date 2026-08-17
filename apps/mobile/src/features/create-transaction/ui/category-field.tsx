import { Controller, useFormContext } from 'react-hook-form'
import type { CategoryType } from '@expense-tracker/api'
import { FormError, FormField, FormLabel } from '@/shared/ui/form'
import { Text } from '@/shared/ui/text'
import { useCategories } from '@/entities/category/model/use-categories'
import type { CreateTransactionFormValues } from '../model/schema'
import { OptionRow } from './option-select'

/** Category selector for the expense/income variants, filtered to the flow's type. */
export function CategoryField({ type }: { type: CategoryType }) {
  const { control } = useFormContext<CreateTransactionFormValues>()
  const categoriesQuery = useCategories()
  const flowCategories = (categoriesQuery.data ?? []).filter((c) => c.type === type)

  return (
    <Controller
      control={control}
      name="categoryId"
      render={({ field, fieldState }) => (
        <FormField>
          <FormLabel className={fieldState.error ? 'text-destructive' : undefined}>
            Категория
          </FormLabel>
          {flowCategories.length === 0 ? (
            <Text variant="body-sm" className="text-muted-foreground">
              Нет категорий этого типа - создайте категорию на главном экране
            </Text>
          ) : (
            <OptionRow
              testIDPrefix="new-transaction-category"
              options={flowCategories.map((category) => ({
                id: category.id,
                label: category.name,
              }))}
              selectedId={field.value}
              onSelect={field.onChange}
            />
          )}
          <FormError testID="new-transaction-category-error">{fieldState.error?.message}</FormError>
        </FormField>
      )}
    />
  )
}
