import { useEffect, useRef, useState } from 'react'
import { FlatList, View } from 'react-native'
import type { Category } from '@expense-tracker/api'
import { Icon, type IconName } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import { Pressable } from '@/shared/ui/pressable'
import { cn } from '@/shared/lib/utils'

/**
 * Horizontal category pills with a leading menu button that opens the full
 * category picker sheet. After the selection changes - including from the
 * picker sheet - the list scrolls so the selected pill sits near the center.
 */
export function CategoryQuickBar({
  categories,
  selectedId,
  onSelect,
  onOpenMenu,
}: {
  categories: Category[]
  selectedId: string
  onSelect: (id: string) => void
  onOpenMenu: () => void
}) {
  const listRef = useRef<FlatList<Category>>(null)
  // Pill layouts are captured as they mount; widths vary with label lengths,
  // so offsets are computed from measured positions rather than estimated.
  const itemLayouts = useRef(new Map<string, { x: number; width: number }>())
  const [listWidth, setListWidth] = useState(0)
  const [contentWidth, setContentWidth] = useState(0)

  useEffect(() => {
    const layout = itemLayouts.current.get(selectedId)
    if (!layout || listWidth === 0) return
    const centered = layout.x - (listWidth - layout.width) / 2
    const maxOffset = Math.max(0, contentWidth - listWidth)
    listRef.current?.scrollToOffset({
      offset: Math.min(Math.max(0, centered), maxOffset),
      animated: true,
    })
  }, [selectedId, listWidth, contentWidth])

  return (
    <FlatList
      ref={listRef}
      testID="new-transaction-category-list"
      horizontal
      data={categories}
      keyExtractor={(category) => category.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
      onLayout={(event) => setListWidth(event.nativeEvent.layout.width)}
      onContentSizeChange={(width) => setContentWidth(width)}
      ListHeaderComponent={
        <Pressable
          testID="new-transaction-category-menu"
          accessibilityRole="button"
          accessibilityLabel="Все категории"
          className="h-10 w-10 items-center justify-center rounded-full border border-border"
          onPress={onOpenMenu}
        >
          <Icon name="menu" size={18} colorClassName="accent-muted-foreground" />
        </Pressable>
      }
      renderItem={({ item: category }) => {
        const selected = category.id === selectedId
        return (
          <Pressable
            testID={`new-transaction-category-${category.id}`}
            accessibilityRole="button"
            accessibilityLabel={category.name}
            accessibilityState={{ selected }}
            className={cn(
              'h-10 flex-row items-center gap-2 rounded-full border px-2 pr-3',
              selected ? 'border-primary bg-secondary' : 'border-border',
            )}
            onLayout={(event) =>
              itemLayouts.current.set(category.id, {
                x: event.nativeEvent.layout.x,
                width: event.nativeEvent.layout.width,
              })
            }
            onPress={() => onSelect(category.id)}
          >
            <View
              className={cn(
                'h-7 w-7 items-center justify-center rounded-full',
                category.color ? undefined : 'bg-muted',
              )}
              style={category.color ? { backgroundColor: category.color } : undefined}
            >
              <Icon name={category.icon as IconName} size={14} colorClassName="accent-white" />
            </View>
            <Text
              variant="body-sm"
              className={selected ? 'font-medium text-primary' : 'text-foreground'}
              numberOfLines={1}
            >
              {category.name}
            </Text>
          </Pressable>
        )
      }}
    />
  )
}
