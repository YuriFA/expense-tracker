import { useMemo, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { Category } from '@expense-tracker/api'
import { mapCategories } from '@expense-tracker/i18n'
import { BottomSheet, ListRow, Text, Button, useTokens } from '@shared/ui'
import { useCategories } from '@entities/category'
import { CategoryFormSheet } from './CategoryFormSheet'

interface CategoryManageSheetProps {
  visible: boolean
  onClose: () => void
}

/**
 * The Categories management surface (design section 6/13: "Users can create
 * their own" + "Account and category CRUD works"). Reached from Settings.
 *
 * Lists the categories - seed names localized via `mapCategories` - grouped by
 * type (expense / income). Tap a row to edit it in the shared
 * {@link CategoryFormSheet}; the footer's Add button opens the same sheet in
 * create mode. Uses the canonical BottomSheet + ListRow vocabulary so it reads
 * like the rest of the product.
 */
export function CategoryManageSheet({ visible, onClose }: CategoryManageSheetProps) {
  const { t } = useTranslation()
  const tokens = useTokens()
  const { data: categories, isLoading } = useCategories()

  const [editing, setEditing] = useState<{ mode: 'create' | 'edit'; category?: Category } | null>(
    null,
  )

  const localized = useMemo(
    () => mapCategories(categories ?? [], (key) => t(key)),
    [categories, t],
  )
  const expense = localized.filter((category) => category.type === 'expense')
  const income = localized.filter((category) => category.type === 'income')

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title={t('settings.categories')} heightRatio={0.8}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {isLoading ? null : localized.length === 0 ? (
          <Text size="body" tone="muted" style={styles.empty}>
            {t('settings.categoriesEmpty')}
          </Text>
        ) : null}

        {expense.length > 0 ? (
          <Section title={t('transactions.types.expense')} tokens={tokens}>
            {expense.map((category, index) => (
              <ListRow
                key={category.id}
                onPress={() => setEditing({ mode: 'edit', category })}
                divider={index < expense.length - 1}
                leading={<Text size="title">{category.icon}</Text>}
                trailing={<Chevron />}
              >
                <Text size="body" weight={500} numberOfLines={1}>
                  {category.name}
                </Text>
              </ListRow>
            ))}
          </Section>
        ) : null}

        {income.length > 0 ? (
          <Section title={t('transactions.types.income')} tokens={tokens}>
            {income.map((category, index) => (
              <ListRow
                key={category.id}
                onPress={() => setEditing({ mode: 'edit', category })}
                divider={index < income.length - 1}
                leading={<Text size="title">{category.icon}</Text>}
                trailing={<Chevron />}
              >
                <Text size="body" weight={500} numberOfLines={1}>
                  {category.name}
                </Text>
              </ListRow>
            ))}
          </Section>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          full
          size="lg"
          variant="outline"
          onPress={() => setEditing({ mode: 'create' })}
        >
          {t('addCategory.newCategory')}
        </Button>
      </View>
      </BottomSheet>

      {editing ? (
        <CategoryFormSheet
          visible
          mode={editing.mode}
          category={editing.category}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  )
}

function Section({
  title,
  tokens,
  children,
}: {
  title: string
  tokens: ReturnType<typeof useTokens>
  children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <Text size="label" weight={600} tone="muted" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        {children}
      </View>
    </View>
  )
}

/** Inline decorative chevron; the row itself is the button (no nested target). */
function Chevron() {
  return (
    <Text size="title" tone="muted" accessible={false}>
      ›
    </Text>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingBottom: 8,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  empty: {
    paddingVertical: 24,
    textAlign: 'center',
  },
  footer: {
    paddingTop: 8,
  },
})
