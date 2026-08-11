import { useEffect, useState } from 'react'
import { Alert, View, ScrollView, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import {
  type Category,
  type CategoryType,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
  getRepositoryErrorMessage,
} from '@expense-tracker/api'
import {
  BottomSheet,
  Button,
  TextField,
  Text,
  SegmentedControl,
  useTokens,
  type SegmentOption,
} from '@shared/ui'
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@entities/category'
import { haptics } from '@shared/lib/haptics'
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '../model/category-icons'
import { categoryFormSchema, type CategoryFormValues } from '../model/form-schema'
import { categoryRepositoryErrorMessages } from '../../../model/repository-errors'

interface CategoryFormSheetProps {
  visible: boolean
  onClose: () => void
  /** `create` for a new category; `edit` to mutate `category`. */
  mode: 'create' | 'edit'
  /** Required in `edit` mode; ignored otherwise. */
  category?: Category
}

/**
 * Create / edit a category in a bottom sheet (design section 7: "bottom sheet
 * (filters, edit forms, account/category create)"). Reuses the canonical
 * components (TextField, SegmentedControl, AmountField not needed). Fields:
 * name, type (income/expense), and an emoji + color pick from a curated palette.
 *
 * Field state + validation are owned by react-hook-form (+ zod resolver); the
 * icon + color are picked together via `setValue`. On edit the sheet also offers
 * a destructive delete (confirmation alert).
 *
 * Lives under `pages/settings/features/category-manage` (Fractal FSD) because it
 * is only reached from the Settings screen.
 */
export function CategoryFormSheet({ visible, onClose, mode, category }: CategoryFormSheetProps) {
  const { t } = useTranslation()
  const tokens = useTokens()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const isEdit = mode === 'edit' && category

  const buildDefaults = (): CategoryFormValues =>
    isEdit && category
      ? { name: category.name, type: category.type, icon: category.icon, color: category.color }
      : {
          name: '',
          type: 'expense',
          icon: DEFAULT_CATEGORY_ICON.icon,
          color: DEFAULT_CATEGORY_ICON.color,
        }

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isValid },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema(t)),
    mode: 'onChange',
    defaultValues: buildDefaults(),
  })
  const selectedIcon = useWatch({ control, name: 'icon' }) ?? DEFAULT_CATEGORY_ICON.icon

  const [error, setError] = useState<string | null>(null)

  // Seed local state from the category whenever the sheet opens (edit mode),
  // and reset to sensible defaults in create mode.
  useEffect(() => {
    if (!visible) return
    setError(null)
    reset(buildDefaults())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mode, category?.id])

  const typeOptions: ReadonlyArray<SegmentOption<CategoryType>> = [
    { value: 'expense', label: t('transactions.types.expense') },
    { value: 'income', label: t('transactions.types.income') },
  ]

  const submitting = createCategory.isPending || updateCategory.isPending
  const canSubmit = isValid && !submitting

  const clearError = () => setError(null)

  const onSubmit = async (values: CategoryFormValues) => {
    setError(null)
    try {
      if (isEdit && category) {
        const payload: UpdateCategoryPayload = {
          name: values.name,
          type: values.type,
          icon: values.icon,
          color: values.color,
        }
        await updateCategory.mutateAsync({ id: category.id, payload })
      } else {
        const payload: CreateCategoryPayload = {
          name: values.name,
          type: values.type,
          icon: values.icon,
          color: values.color,
        }
        await createCategory.mutateAsync(payload)
      }
      haptics.notify('success')
      onClose()
    } catch (mutationError) {
      setError(getRepositoryErrorMessage(mutationError, categoryRepositoryErrorMessages(t)))
      haptics.notify('warning')
    }
  }

  const handleDelete = () => {
    if (!isEdit || !category) return
    Alert.alert(
      t('deleteCategory.confirmDelete'),
      t('deleteCategory.confirmDeleteDescription'),
      [
        { text: t('deleteCategory.cancel'), style: 'cancel' },
        {
          text: t('deleteCategory.confirm'),
          style: 'destructive',
          onPress: async () => {
            setError(null)
            try {
              await deleteCategory.mutateAsync(category.id)
              haptics.notify('success')
              onClose()
            } catch (mutationError) {
              setError(getRepositoryErrorMessage(mutationError, categoryRepositoryErrorMessages(t)))
              haptics.notify('warning')
            }
          },
        },
      ],
    )
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t(isEdit ? 'editCategory.title' : 'addCategory.newCategory')}
      heightRatio={0.78}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange }, fieldState: { error: fieldError } }) => (
            <TextField
              label={t('addCategory.nameLabel')}
              placeholder={t('addCategory.namePlaceholder')}
              value={value}
              onChangeText={(text) => {
                onChange(text)
                clearError()
              }}
              error={fieldError?.message ?? null}
            />
          )}
        />

        <View style={styles.field}>
          <Text size="label" tone="muted" style={styles.fieldLabel}>
            {t('fields.transactionType')}
          </Text>
          <Controller
            control={control}
            name="type"
            render={({ field: { value, onChange } }) => (
              <SegmentedControl
                options={typeOptions}
                value={value}
                onChange={(next) => {
                  onChange(next)
                  clearError()
                }}
                accessibilityLabel={t('fields.transactionType')}
              />
            )}
          />
        </View>

        <View style={styles.field}>
          <Text size="label" tone="muted" style={styles.fieldLabel}>
            {t('addCategory.iconLabel')}
          </Text>
          <View
            style={styles.iconGrid}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('addCategory.iconLabel')}
          >
            {CATEGORY_ICONS.map((entry) => {
              const selected = entry.icon === selectedIcon
              return (
                <Pressable
                  key={`${entry.icon}-${entry.color}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={entry.icon}
                  onPress={() => {
                    setValue('icon', entry.icon, { shouldDirty: true, shouldValidate: true })
                    setValue('color', entry.color, { shouldDirty: true, shouldValidate: true })
                    clearError()
                  }}
                  style={({ pressed }) => [
                    styles.iconTile,
                    {
                      borderColor: selected ? tokens.ink : 'transparent',
                      backgroundColor: selected ? tokens.muted : 'transparent',
                    },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text size="title">{entry.icon}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {error ? (
          <Text size="caption" tone="destructive" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          full
          size="lg"
          loading={submitting}
          disabled={!canSubmit}
          onPress={() => void handleSubmit(onSubmit)()}
        >
          {t(isEdit ? 'editCategory.submit' : 'addCategory.submit')}
        </Button>
        {isEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('deleteCategory.trigger')}
            onPress={handleDelete}
            style={({ pressed }) => [styles.deleteRow, pressed && { opacity: 0.6 }]}
          >
            <Text size="body" weight={500} tone="destructive">
              {t('deleteCategory.trigger')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 16,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    marginBottom: 2,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  iconTile: {
    width: '20%',
    aspectRatio: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 12,
  },
  error: {
    marginTop: 4,
  },
  footer: {
    paddingTop: 8,
  },
  deleteRow: {
    minHeight: 44,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
