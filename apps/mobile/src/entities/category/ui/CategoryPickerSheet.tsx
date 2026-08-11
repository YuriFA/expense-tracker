import { ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { BottomSheet, ListRow, Text, useTokens } from '@shared/ui'
import { haptics } from '@shared/lib/haptics'
import type { Category } from '@expense-tracker/api'

interface CategoryPickerSheetProps {
  visible: boolean
  onClose: () => void
  /** Title shown at the top of the sheet. */
  title: string
  /** Categories to list (expected pre-localized + filtered by type by caller). */
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/**
 * A native-feeling category picker (the Home "category button" target). Renders
 * the active-type categories as tappable rows - emoji + localized name, with an
 * ink check on the selected row - inside the shared {@link BottomSheet}. A light
 * haptic fires on selection; picking a row closes the sheet.
 *
 * Presentational: the caller owns localization (`mapCategories`) and type
 * filtering, mirroring the {@link CategoryGrid} contract.
 */
export function CategoryPickerSheet({
  visible,
  onClose,
  title,
  categories,
  selectedId,
  onSelect,
}: CategoryPickerSheetProps) {
  const { t } = useTranslation()
  const tokens = useTokens()

  const handleSelect = (id: string) => {
    if (id !== selectedId) {
      haptics.impact('light')
      onSelect(id)
    }
    onClose()
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} heightRatio={0.6}>
      <ScrollView contentContainerStyle={{ gap: 4, paddingVertical: 4 }} keyboardShouldPersistTaps="handled">
        {categories.length === 0 ? (
          <Text size="body" tone="muted" style={{ paddingVertical: 24, textAlign: 'center' }}>
            {t('settings.categoriesEmpty')}
          </Text>
        ) : null}
        {categories.map((category, index) => {
          const selected = category.id === selectedId
          return (
            <ListRow
              key={category.id}
              onPress={() => handleSelect(category.id)}
              divider={index < categories.length - 1}
              leading={<Text size="title">{category.icon}</Text>}
              trailing={
                selected ? <Ionicons name="checkmark" size={18} color={tokens.ink} /> : null
              }
            >
              <Text size="body" weight={selected ? 600 : 500} numberOfLines={1}>
                {category.name}
              </Text>
            </ListRow>
          )
        })}
      </ScrollView>
    </BottomSheet>
  )
}
