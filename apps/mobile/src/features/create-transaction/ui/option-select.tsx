// Visual building blocks the account/category Controllers render: a
// horizontal row of selectable chips (conventions forms.md §2).

import { Pressable, ScrollView } from 'react-native'
import { Text } from '@/shared/ui/text'
import { cn } from '@/shared/lib/utils'

function OptionChip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string
  selected: boolean
  onPress: () => void
  testID: string
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={cn(
        'rounded-xl border px-4 py-2.5',
        selected ? 'border-primary bg-secondary' : 'border-border',
      )}
      onPress={onPress}
    >
      <Text variant="body-sm" className={selected ? 'font-medium text-primary' : 'text-foreground'}>
        {label}
      </Text>
    </Pressable>
  )
}

export function OptionRow({
  options,
  selectedId,
  onSelect,
  testIDPrefix,
}: {
  options: { id: string; label: string }[]
  selectedId: string
  onSelect: (id: string) => void
  testIDPrefix: string
}) {
  return (
    <ScrollView
      horizontal
      testID={`${testIDPrefix}-list`}
      contentContainerStyle={{ gap: 8 }}
      showsHorizontalScrollIndicator={false}
    >
      {options.map((option) => (
        <OptionChip
          key={option.id}
          testID={`${testIDPrefix}-${option.id}`}
          label={option.label}
          selected={selectedId === option.id}
          onPress={() => onSelect(option.id)}
        />
      ))}
    </ScrollView>
  )
}
