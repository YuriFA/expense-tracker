import { Controller, useFormContext } from 'react-hook-form'
import { View } from 'react-native'
import { Icon } from '@/shared/ui/icon'
import { Pressable } from '@/shared/ui/pressable'
import type { CreateTransactionFormValues } from '../model/schema'
import { BottomSheetInput } from '@/shared/ui/bottom-sheet'

/**
 * The note's two halves: the toggle button that lives in the sheet's action
 * row, and the input it reveals directly above that row (a normal conditional
 * layout - no absolute positioning). The text itself is form state, so it
 * survives hiding and reopening the input; only visibility is local.
 */
export function NoteButton({
  open,
  hasNote,
  onToggle,
}: {
  open: boolean
  hasNote: boolean
  onToggle: () => void
}) {
  return (
    <Pressable
      testID="new-transaction-note-button"
      accessibilityRole="button"
      accessibilityLabel={open ? 'Скрыть заметку' : 'Добавить заметку'}
      accessibilityState={{ expanded: open }}
      className="size-12 items-center justify-center"
      onPress={onToggle}
    >
      <Icon
        name={open ? 'chatbubble' : 'chatbubble-outline'}
        size={24}
        colorClassName={hasNote || open ? 'accent-primary' : 'accent-muted-foreground'}
      />
      {hasNote ? (
        <View className="absolute right-2 top-1.5 size-2 rounded-full bg-primary" />
      ) : null}
    </Pressable>
  )
}

export function NoteInput() {
  const { control } = useFormContext<CreateTransactionFormValues>()

  return (
    <Controller
      control={control}
      name="description"
      render={({ field }) => (
        <BottomSheetInput
          autoFocus
          className="pt-4 pb-0 px-2 border-x-0 border-b-0 rounded-none border-t border-t-border"
          testID="new-transaction-note-input"
          placeholder="Заметка"
          value={field.value}
          onChangeText={field.onChange}
        />
      )}
    />
  )
}
