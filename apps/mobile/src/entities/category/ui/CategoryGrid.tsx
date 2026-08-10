import { View, Pressable, StyleSheet } from 'react-native'
import { useTokens, Text } from '@shared/ui'
import type { Category } from '@expense-tracker/api'

interface CategoryGridProps {
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** A11y label for the grid. */
  accessibilityLabel?: string
}

const COLUMNS = 4

/**
 * Four-column category icon grid (design section 7). Tap to select; the
 * selected cell takes an ink ring + muted fill. Color-blind safe: cells differ
 * by icon + name (the emoji is the primary distinguisher), so category color is
 * not relied upon and is left unused in chrome per the design system.
 *
 * The categories passed in are expected to already be filtered by type and
 * localized (`mapCategories`), so this component stays presentational.
 */
export function CategoryGrid({
  categories,
  selectedId,
  onSelect,
  accessibilityLabel,
}: CategoryGridProps) {
  const tokens = useTokens()

  return (
    <View
      role="radiogroup"
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={styles.grid}
    >
      {categories.map((category) => {
        const selected = category.id === selectedId
        return (
          <Pressable
            key={category.id}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={category.name}
            onPress={() => onSelect(category.id)}
            style={({ pressed }) => [
              styles.cell,
              {
                backgroundColor: selected ? tokens.muted : 'transparent',
                borderColor: selected ? tokens.ink : 'transparent',
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text size="title">{category.icon}</Text>
            <Text
              size="caption"
              tone={selected ? 'ink' : 'muted'}
              numberOfLines={1}
              style={styles.name}
            >
              {category.name}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  cell: {
    width: `${100 / COLUMNS}%`,
    paddingHorizontal: 4,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 14,
  },
  name: {
    marginTop: 4,
  },
})
