import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { BottomSheetView } from '@gorhom/bottom-sheet'
import { ScrollView } from 'react-native'
import type { CategoryType } from '@expense-tracker/api'
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetHeader,
  BottomSheetInput,
  BottomSheetRef,
} from '@/shared/ui/bottom-sheet'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import { cn } from '@/shared/lib/utils'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON,
} from '@/entities/category/config/category-appearance'
import { useCreateCategory } from '@/entities/category/model/use-categories'

export interface NewCategorySheetProps {
  ref: React.Ref<BottomSheetRef>
}

/**
 * Create-category form: name, type toggle, icon picker, and color picker
 * (both from the predefined lists), writing through `useCreateCategory`.
 */
export function NewCategorySheet({ ref }: NewCategorySheetProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('expense')
  const [icon, setIcon] = useState<string>(DEFAULT_CATEGORY_ICON)
  const [color, setColor] = useState<string>(DEFAULT_CATEGORY_COLOR)
  const [error, setError] = useState<string | undefined>(undefined)
  const createCategory = useCreateCategory()

  const reset = () => {
    setName('')
    setType('expense')
    setIcon(DEFAULT_CATEGORY_ICON)
    setColor(DEFAULT_CATEGORY_COLOR)
    setError(undefined)
  }

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed || createCategory.isPending) return
    setError(undefined)
    createCategory.mutate(
      { name: trimmed, type, icon, color },
      {
        onSuccess: () => {
          reset()
        },
        onError: (cause: unknown) => {
          setError(getRepositoryErrorText(cause))
        },
      },
    )
  }

  return (
    <BottomSheet ref={ref} testID="home-new-category-sheet" snapPoints={['75%']}>
      <BottomSheetView testID="home-new-category-sheet">
        <BottomSheetHeader title="Новая категория" />
        <BottomSheetBody className="gap-4">
          <BottomSheetInput
            label="Название"
            placeholder="Например, Транспорт"
            value={name}
            onChangeText={setName}
            error={error}
            errorTestId="home-new-category-error"
            testID="home-new-category-name"
          />

          <View className="flex-row gap-2">
            <Button
              variant={type === 'expense' ? 'primary' : 'outline'}
              text="Расход"
              className="flex-1"
              onPress={() => setType('expense')}
              testID="home-new-category-type-expense"
            />
            <Button
              variant={type === 'income' ? 'primary' : 'outline'}
              text="Доход"
              className="flex-1"
              onPress={() => setType('income')}
              testID="home-new-category-type-income"
            />
          </View>

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
                  accessibilityState={{ selected: icon === option }}
                  className={cn(
                    'h-11 w-11 items-center justify-center rounded-xl border',
                    icon === option ? 'border-primary bg-secondary' : 'border-border',
                  )}
                  onPress={() => setIcon(option)}
                >
                  <Icon
                    name={option}
                    size={22}
                    colorClassName={icon === option ? 'accent-primary' : 'accent-foreground'}
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View className="gap-2">
            <Text variant="label">Цвет</Text>
            <View className="flex-row flex-wrap gap-2" testID="home-new-category-colors">
              {CATEGORY_COLORS.map((option) => (
                <Pressable
                  key={option}
                  testID={`home-new-category-color-${option.replace('#', '')}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Цвет ${option}`}
                  accessibilityState={{ selected: color === option }}
                  className={cn(
                    'h-10 w-10 items-center justify-center rounded-full border-2',
                    color === option ? 'border-primary' : 'border-transparent',
                  )}
                  style={{ backgroundColor: option }}
                  onPress={() => setColor(option)}
                >
                  {color === option ? (
                    <Icon name="checkmark" size={18} colorClassName="accent-white" />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>

          <Button
            variant="primary"
            text="Создать"
            disabled={!name.trim()}
            loading={createCategory.isPending}
            onPress={submit}
            testID="home-new-category-submit"
          />
        </BottomSheetBody>
      </BottomSheetView>
    </BottomSheet>
  )
}
