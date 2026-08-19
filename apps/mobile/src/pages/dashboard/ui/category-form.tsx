// Category form: name, type toggle, icon picker, and color picker (both from
// the predefined lists). Create mode writes through `useCreateCategory`; edit
// mode (a `category` prop) prefills from the record and writes through
// `useUpdateCategory`, sending the record's version as the CAS token.

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, ScrollView, View } from 'react-native'
import type { Category } from '@expense-tracker/api'
import { BottomSheetInput } from '@/shared/ui/bottom-sheet'
import { Button } from '@/shared/ui/button'
import { FormError, FormField, FormLabel } from '@/shared/ui/form'
import { Icon } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import { cn } from '@/shared/lib/utils'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/entities/category/config/category-appearance'
import { useCreateCategory, useUpdateCategory } from '@/entities/category/model/use-categories'
import {
  newCategoryDefaultValues,
  newCategorySchema,
  type NewCategoryFormValues,
} from '../model/schema'

interface CategoryFormProps {
  /** The record to edit; omit for the create flow. */
  category?: Category
  /** Optional container hook; the create sheet stays open on success. */
  onSuccess?: () => void
}

function categoryInitialValues(category: Category | undefined): NewCategoryFormValues {
  if (!category) return newCategoryDefaultValues
  return {
    name: category.name,
    type: category.type,
    icon: category.icon,
    color: category.color,
  }
}

export function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const isEdit = category !== undefined
  // testIDs stay stable per mode: the create and edit sheets are both always
  // mounted on the dashboard, so each mode needs its own unique prefix.
  const id = isEdit ? 'category-edit' : 'home-new-category'

  const form = useForm<NewCategoryFormValues>({
    resolver: zodResolver(newCategorySchema),
    defaultValues: categoryInitialValues(category),
  })
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const pending =
    form.formState.isSubmitting || createCategory.isPending || updateCategory.isPending

  const handleSubmit = async (values: NewCategoryFormValues) => {
    try {
      if (isEdit && category) {
        await updateCategory.mutateAsync({
          id: category.id,
          payload: { ...values, version: category.version },
        })
      } else {
        await createCategory.mutateAsync(values)
        form.reset(newCategoryDefaultValues)
      }
      onSuccess?.()
    } catch (cause) {
      form.setError('root', { message: getRepositoryErrorText(cause) })
    }
  }

  return (
    <View className="gap-4">
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <FormField>
            <FormLabel className={fieldState.error ? 'text-destructive' : undefined}>
              Название
            </FormLabel>
            <BottomSheetInput
              placeholder="Например, Транспорт"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              invalid={Boolean(fieldState.error)}
              testID={`${id}-name`}
            />
            <FormError testID={`${id}-name-error`}>{fieldState.error?.message}</FormError>
          </FormField>
        )}
      />

      <Controller
        control={form.control}
        name="type"
        render={({ field }) => (
          <View className="flex-row gap-2">
            <Button
              variant={field.value === 'expense' ? 'primary' : 'outline'}
              text="Расход"
              className="flex-1"
              onPress={() => field.onChange('expense')}
              testID={`${id}-type-expense`}
            />
            <Button
              variant={field.value === 'income' ? 'primary' : 'outline'}
              text="Доход"
              className="flex-1"
              onPress={() => field.onChange('income')}
              testID={`${id}-type-income`}
            />
          </View>
        )}
      />

      <Controller
        control={form.control}
        name="icon"
        render={({ field }) => (
          <View className="gap-2">
            <Text variant="label">Иконка</Text>
            <ScrollView horizontal testID={`${id}-icons`} contentContainerStyle={{ gap: 8 }}>
              {CATEGORY_ICONS.map((option) => (
                <Pressable
                  key={option}
                  testID={`${id}-icon-${option}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Иконка ${option}`}
                  accessibilityState={{ selected: field.value === option }}
                  className={cn(
                    'h-11 w-11 items-center justify-center rounded-xl border',
                    field.value === option ? 'border-primary bg-secondary' : 'border-border',
                  )}
                  onPress={() => field.onChange(option)}
                >
                  <Icon
                    name={option}
                    size={22}
                    colorClassName={field.value === option ? 'accent-primary' : 'accent-foreground'}
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      />

      <Controller
        control={form.control}
        name="color"
        render={({ field }) => (
          <View className="gap-2">
            <Text variant="label">Цвет</Text>
            <View className="flex-row flex-wrap gap-2" testID={`${id}-colors`}>
              {CATEGORY_COLORS.map((option) => (
                <Pressable
                  key={option}
                  testID={`${id}-color-${option.replace('#', '')}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Цвет ${option}`}
                  accessibilityState={{ selected: field.value === option }}
                  className={cn(
                    'h-10 w-10 items-center justify-center rounded-full border-2',
                    field.value === option ? 'border-primary' : 'border-transparent',
                  )}
                  style={{ backgroundColor: option }}
                  onPress={() => field.onChange(option)}
                >
                  {field.value === option ? (
                    <Icon name="checkmark" size={18} colorClassName="accent-white" />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        )}
      />

      <FormError testID={`${id}-error`}>{form.formState.errors.root?.message}</FormError>

      <Button
        variant="primary"
        text={isEdit ? 'Сохранить' : 'Создать'}
        loading={pending}
        disabled={pending}
        onPress={form.handleSubmit(handleSubmit)}
        testID={`${id}-submit`}
      />
    </View>
  )
}
