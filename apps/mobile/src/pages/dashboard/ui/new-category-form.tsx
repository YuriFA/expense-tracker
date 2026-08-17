// Create-category form: name, type toggle, icon picker, and color picker
// (both from the predefined lists), writing through `useCreateCategory`.

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, ScrollView, View } from 'react-native'
import { BottomSheetInput } from '@/shared/ui/bottom-sheet'
import { Button } from '@/shared/ui/button'
import { FormError, FormField, FormLabel } from '@/shared/ui/form'
import { Icon } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import { cn } from '@/shared/lib/utils'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/entities/category/config/category-appearance'
import { useCreateCategory } from '@/entities/category/model/use-categories'
import {
  newCategoryDefaultValues,
  newCategorySchema,
  type NewCategoryFormValues,
} from '../model/schema'

interface NewCategoryFormProps {
  /** Optional container hook; the dashboard sheet stays open on success. */
  onSuccess?: () => void
}

export function NewCategoryForm({ onSuccess }: NewCategoryFormProps) {
  const form = useForm<NewCategoryFormValues>({
    resolver: zodResolver(newCategorySchema),
    defaultValues: newCategoryDefaultValues,
  })
  const createCategory = useCreateCategory()

  const handleSubmit = async (values: NewCategoryFormValues) => {
    try {
      await createCategory.mutateAsync(values)
      form.reset(newCategoryDefaultValues)
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
              testID="home-new-category-name"
            />
            <FormError testID="home-new-category-name-error">{fieldState.error?.message}</FormError>
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
              testID="home-new-category-type-expense"
            />
            <Button
              variant={field.value === 'income' ? 'primary' : 'outline'}
              text="Доход"
              className="flex-1"
              onPress={() => field.onChange('income')}
              testID="home-new-category-type-income"
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
            <ScrollView
              horizontal
              testID="home-new-category-icons"
              contentContainerStyle={{ gap: 8 }}
            >
              {CATEGORY_ICONS.map((option) => (
                <Pressable
                  key={option}
                  testID={`home-new-category-icon-${option}`}
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
            <View className="flex-row flex-wrap gap-2" testID="home-new-category-colors">
              {CATEGORY_COLORS.map((option) => (
                <Pressable
                  key={option}
                  testID={`home-new-category-color-${option.replace('#', '')}`}
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

      <FormError testID="home-new-category-error">{form.formState.errors.root?.message}</FormError>

      <Button
        variant="primary"
        text="Создать"
        loading={form.formState.isSubmitting || createCategory.isPending}
        disabled={createCategory.isPending}
        onPress={form.handleSubmit(handleSubmit)}
        testID="home-new-category-submit"
      />
    </View>
  )
}
