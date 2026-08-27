// Join-by-code sheet (household-join design D6, the Settings «У меня есть
// код» entry): one code field (8 chars of the unambiguous alphabet,
// uppercased/trimmed while typing) and a submit that joins via the API and
// then walks the shared data-choice dialog (carry default) before the page
// navigates home. Mirrors the debtor form sheet (conventions forms.md §1/§3):
// the sheet owns its lifecycle (mounted per open with presentOnMount), the
// form owns its state and submission.
//
// TODO(i18n): RU wording until mobile i18n wiring lands.

import { useRef, useState } from 'react'
import { View } from 'react-native'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { householdApi } from '@/entities/household'
import { useHouseholdJoin } from '@/features/household-join'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetHeader,
  BottomSheetInput,
  BottomSheetView,
  type BottomSheetRef,
} from '@/shared/ui/bottom-sheet'
import { Button } from '@/shared/ui/button'
import { FormError, FormField, FormLabel } from '@/shared/ui/form'
import { joinByCodeSchema, type JoinByCodeFormValues } from '../model/schema'

const CODE_DEFAULT_VALUES: JoinByCodeFormValues = { code: '' }

export interface JoinByCodeSheetProps {
  /** Called once the join AND the data choice completed; unmounts the sheet. */
  onJoined: () => void
}

export function JoinByCodeSheet({ onJoined }: JoinByCodeSheetProps) {
  // Mounted per open with a fresh key; presentOnMount presents it
  // (forms.md §3). The ref is handed to the form for its dismissal.
  const sheetRef = useRef<BottomSheetRef>(null)

  return (
    <BottomSheet
      ref={sheetRef}
      presentOnMount
      testID="settings-join-code-sheet"
      snapPoints={['40%']}
      stackBehavior="push"
    >
      {/* The visible element carrying the sheet testID (accounts-sheet
          pattern): the modal container itself is zero-bounds to Maestro. */}
      <BottomSheetView testID="settings-join-code-sheet">
        <BottomSheetBody>
          <JoinByCodeForm sheetRef={sheetRef} onJoined={onJoined} />
        </BottomSheetBody>
      </BottomSheetView>
    </BottomSheet>
  )
}

function JoinByCodeForm({
  sheetRef,
  onJoined,
}: {
  sheetRef: React.Ref<BottomSheetRef>
  onJoined: () => void
}) {
  const form = useForm<JoinByCodeFormValues>({
    resolver: zodResolver(joinByCodeSchema),
    defaultValues: CODE_DEFAULT_VALUES,
    mode: 'onChange',
  })
  const { chooseHouseholdData } = useHouseholdJoin()
  const [isJoining, setIsJoining] = useState(false)

  const dismiss = () => {
    // TODO(sheet-dismiss): see the matching TODO in
    // features/cashflow-overview/ui/edit-category-sheet.tsx.
    if (sheetRef && typeof sheetRef !== 'function') sheetRef.current?.dismiss()
  }

  const handleSubmit = async (values: JoinByCodeFormValues) => {
    setIsJoining(true)
    try {
      const household = await householdApi.joinByCode(values.code)
      // No prior screen asked: the shared non-cancelable choice dialog,
      // carry first (design D6).
      await chooseHouseholdData(household)
      form.reset(CODE_DEFAULT_VALUES)
      dismiss()
      onJoined()
    } catch (cause) {
      form.setError('root', { message: getRepositoryErrorText(cause) })
      setIsJoining(false)
    }
  }

  return (
    <View className="gap-4">
      <BottomSheetHeader title="Присоединиться по коду" />

      <Controller
        control={form.control}
        name="code"
        render={({ field, fieldState }) => (
          <FormField>
            <FormLabel className={fieldState.error ? 'text-destructive' : undefined}>
              Код домохозяйства
            </FormLabel>
            <BottomSheetInput
              testID="settings-join-code-input"
              placeholder="Например, AB23CD45"
              value={field.value}
              onChangeText={(text) => field.onChange(text.replace(/\s+/g, '').toUpperCase())}
              onBlur={field.onBlur}
              autoCapitalize="characters"
              keyboardType="default"
              maxLength={8}
              invalid={Boolean(fieldState.error)}
            />
            <FormError testID="settings-join-code-error">{fieldState.error?.message}</FormError>
          </FormField>
        )}
      />

      <FormError testID="settings-join-code-form-error">
        {form.formState.errors.root?.message}
      </FormError>

      <Button
        variant="primary"
        text="Присоединиться"
        loading={isJoining || form.formState.isSubmitting}
        disabled={isJoining}
        onPress={form.handleSubmit(handleSubmit)}
        testID="settings-join-code-submit"
      />
    </View>
  )
}
