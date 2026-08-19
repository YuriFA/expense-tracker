import { memo, useCallback, useState } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'
import { View } from 'react-native'
import type { CreateTransactionFormValues } from '../model/schema'
import { DateField, DateFieldButton } from './date-field'
import { NoteFieldButton, NoteInput } from './note-field'
import { TransactionSubmitButton } from './transaction-submit-button'

/**
 * The expanding action toolbar at the bottom of the sheet: owns only the two
 * reveal flags (note input, quick dates) and the layout around them. Every
 * reactive part is a self-subscribing field component - a date change
 * re-renders the date parts alone, a note keystroke the note parts, a
 * validity flip only the submit button; toggling one reveal leaves the others
 * untouched (stable toggles + memo).
 */
export function FormActions({ pending, onSubmit }: { pending: boolean; onSubmit: () => void }) {
  // Ephemeral UI state only - the values themselves live in the form.
  const [noteOpen, setNoteOpen] = useState(false)
  const [quickDatesOpen, setQuickDatesOpen] = useState(false)
  const toggleNote = useCallback(() => setNoteOpen((open) => !open), [])
  const toggleQuickDates = useCallback(() => setQuickDatesOpen((open) => !open), [])

  return (
    // gap-4 keeps the spacing the reveal rows had as direct children of the
    // form's gap-4 container.
    <View className="gap-4">
      <DateField open={quickDatesOpen} />
      {noteOpen ? <NoteInput /> : null}

      <View className="flex-row items-center py-2 border-t border-t-border">
        <NoteFieldButton open={noteOpen} onToggle={toggleNote} />
        <DateFieldButton open={quickDatesOpen} onToggle={toggleQuickDates} />
        <TransactionSubmitField pending={pending} onPress={onSubmit} />
      </View>
    </View>
  )
}

/** The submit control, isolated so validity flips re-render only the button. */
const TransactionSubmitField = memo(function TransactionSubmitField({
  pending,
  onPress,
}: {
  pending: boolean
  onPress: () => void
}) {
  const { control } = useFormContext<CreateTransactionFormValues>()
  const { isValid, isSubmitting } = useFormState({ control })

  return (
    <TransactionSubmitButton
      className="ml-auto"
      disabled={!isValid}
      loading={isSubmitting || pending}
      onPress={onPress}
    />
  )
})
