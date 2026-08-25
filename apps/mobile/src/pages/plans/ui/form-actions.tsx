// The plans form footer (design D7): the circular submit alone, reserving
// the bottom safe area (`pb-safe`, the debtor-history-sheet idiom). Both
// plans forms share it — the add/edit form (as the sheet's footerComponent)
// and the manual confirm sheet (inline); the date/note fields live as rows
// in the form body, so the footer carries no field logic. The submit leaf
// alone subscribes to form-wide state (components-and-state §4, forms.md
// §8).

import { memo } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'
import { View } from 'react-native'
import { TransactionSubmitButton } from '@/features/create-transaction'

/**
 * The structural form slice the footer needs: nothing beyond form-wide
 * state (validity, submitting, the root error slot), so any plans form's
 * context satisfies it.
 */
type PlansFooterValues = Record<string, unknown>

export function PlansFormFooter({
  testID,
  accessibilityLabel,
  pending,
  onSubmit,
}: {
  testID: string
  accessibilityLabel: string
  pending: boolean
  onSubmit: () => void
}) {
  return (
    <View className="flex-row justify-end px-4 pb-safe pt-1">
      <SubmitField
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        pending={pending}
        onPress={onSubmit}
      />
    </View>
  )
}

/** The submit control, isolated: it alone subscribes to form validity. */
const SubmitField = memo(function SubmitField({
  testID,
  accessibilityLabel,
  pending,
  onPress,
}: {
  testID: string
  accessibilityLabel: string
  pending: boolean
  onPress: () => void
}) {
  const { control } = useFormContext<PlansFooterValues>()
  const { isValid, isSubmitting, errors } = useFormState({ control })
  // A repository error parked at the root slot flips RHF's `isValid` off
  // even though the values still pass the schema - the button must stay
  // pressable so the user can retry (handleSubmit re-validates and clears
  // the root error itself).
  const valuesValid = isValid || Boolean(errors.root)

  return (
    <TransactionSubmitButton
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      disabled={!valuesValid}
      loading={isSubmitting || pending}
      onPress={onPress}
    />
  )
})
