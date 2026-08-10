import { useEffect, useState } from 'react'
import { Alert, View, ScrollView, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
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
 * Color is stored (matching the seed shape) but is not used in chrome - the
 * category is distinguished by icon + name (color-blind safe). On edit the
 * sheet also offers a destructive delete (confirmation alert), disabled-state is
 * the canonical empty/blank guard.
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

  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('expense')
  const [icon, setIcon] = useState<string>(DEFAULT_CATEGORY_ICON.icon)
  const [color, setColor] = useState<string>(DEFAULT_CATEGORY_ICON.color)
  const [error, setError] = useState<string | null>(null)

  const isEdit = mode === 'edit' && category

  // Seed local state from the category whenever the sheet opens (edit mode),
  // and reset to sensible defaults in create mode.
  useEffect(() => {
    if (!visible) return
    setError(null)
    if (isEdit && category) {
      setName(category.name)
      setType(category.type)
      setIcon(category.icon)
      setColor(category.color)
    } else {
      setName('')
      setType('expense')
      setIcon(DEFAULT_CATEGORY_ICON.icon)
      setColor(DEFAULT_CATEGORY_ICON.color)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mode, category?.id])

  const typeOptions: ReadonlyArray<SegmentOption<CategoryType>> = [
    { value: 'expense', label: t('transactions.types.expense') },
    { value: 'income', label: t('transactions.types.income') },
  ]

  const submitting = createCategory.isPending || updateCategory.isPending
  const canSubmit = name.trim().length > 0 && !submitting

  const pickIcon = (value: string, accent: string) => {
    setIcon(value)
    setColor(accent)
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setError(null)
    try {
      if (isEdit && category) {
        const payload: UpdateCategoryPayload = {
          name: name.trim(),
          type,
          icon,
          color,
        }
        await updateCategory.mutateAsync({ id: category.id, payload })
      } else {
        const payload: CreateCategoryPayload = {
          name: name.trim(),
          type,
          icon,
          color,
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
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label={t('addCategory.nameLabel')}
          placeholder={t('addCategory.namePlaceholder')}
          value={name}
          onChangeText={(text) => {
            setName(text)
            setError(null)
          }}
        />

        <View style={styles.field}>
          <Text size="label" tone="muted" style={styles.fieldLabel}>
            {t('fields.transactionType')}
          </Text>
          <SegmentedControl
            options={typeOptions}
            value={type}
            onChange={setType}
            accessibilityLabel={t('fields.transactionType')}
          />
        </View>

        <View style={styles.field}>
          <Text size="label" tone="muted" style={styles.fieldLabel}>
            {t('addCategory.iconLabel')}
          </Text>
          <View style={styles.iconGrid}>
            {CATEGORY_ICONS.map((entry) => {
              const selected = entry.icon === icon
              return (
                <Pressable
                  key={`${entry.icon}-${entry.color}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={entry.icon}
                  onPress={() => pickIcon(entry.icon, entry.color)}
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
          onPress={() => void handleSubmit()}
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
