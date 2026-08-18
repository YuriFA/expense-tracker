import { View } from 'react-native'
import { Icon } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import { Pressable } from '@/shared/ui/pressable'
import { cn } from '@/shared/lib/utils'
import type { KeypadKey } from '../model/amount-keypad'

const KEY_ROWS: KeypadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['separator', '0', 'backspace'],
]

function keyContent(key: KeypadKey) {
  switch (key) {
    case 'separator':
      return { node: <Text variant="h2">,</Text>, label: 'Запятая' }
    case 'backspace':
      return {
        node: <Icon name="backspace-outline" size={28} colorClassName="accent-muted-foreground" />,
        label: 'Стереть',
      }
    default:
      return { node: <Text variant="h2">{key}</Text>, label: key }
  }
}

/**
 * Full-width numeric keypad pinned to the bottom of the sheet - the only way
 * the amount is edited (the system keyboard is never involved). Keys are pure
 * `applyKeypadInput` transitions, so calculator operator keys could be added
 * later without changing this layout.
 */
export function AmountKeypad({ onKey }: { onKey: (key: KeypadKey) => void }) {
  return (
    <View className="border-t border-border pb-safe" testID="new-transaction-keypad">
      {KEY_ROWS.map((row, rowIndex) => (
        <View key={rowIndex} className={cn('flex-row', rowIndex > 0 && 'border-t border-border')}>
          {row.map((key, keyIndex) => {
            const { node, label } = keyContent(key)
            return (
              <Pressable
                key={key}
                testID={`new-transaction-key-${key}`}
                accessibilityRole="button"
                accessibilityLabel={label}
                className={cn(
                  'flex-1 items-center justify-center py-4',
                  keyIndex > 0 && 'border-l border-border',
                )}
                onPress={() => onKey(key)}
              >
                {node}
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}
