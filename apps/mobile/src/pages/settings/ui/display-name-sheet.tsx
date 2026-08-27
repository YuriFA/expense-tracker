// Display-name sheet (household-ux 2.5): edits the name household members
// see, with the live member-view preview and the email fallback when the
// field is cleared (the v1 API cannot reset the name to null - empty is
// invalid, the preview just explains the fallback). Mirrors the
// join-by-code sheet (forms.md §1/§3).
//
// TODO(i18n): RU wording until mobile i18n wiring lands.

import { useRef, useState } from 'react'
import { View } from 'react-native'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useHouseholdActions } from '@/entities/household'
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
import { Text } from '@/shared/ui/text'
import { displayNameSchema, type DisplayNameFormValues } from '../model/schema'

export interface DisplayNameSheetProps {
  email: string
  initialName: string
  onClose: () => void
}

export function DisplayNameSheet({ email, initialName, onClose }: DisplayNameSheetProps) {
  const sheetRef = useRef<BottomSheetRef>(null)

  return (
    <BottomSheet
      ref={sheetRef}
      presentOnMount
      testID="settings-display-name-sheet"
      snapPoints={['45%']}
      stackBehavior="push"
      onDismiss={onClose}
    >
      <BottomSheetView testID="settings-display-name-sheet">
        <BottomSheetBody>
          <DisplayNameForm
            sheetRef={sheetRef}
            email={email}
            initialName={initialName}
            onSaved={onClose}
          />
        </BottomSheetBody>
      </BottomSheetView>
    </BottomSheet>
  )
}

function DisplayNameForm({
  sheetRef,
  email,
  initialName,
  onSaved,
}: {
  sheetRef: React.Ref<BottomSheetRef>
  email: string
  initialName: string
  onSaved: () => void
}) {
  const form = useForm<DisplayNameFormValues>({
    resolver: zodResolver(displayNameSchema),
    defaultValues: { displayName: initialName },
    mode: 'onChange',
  })
  const actions = useHouseholdActions()
  const [isSaving, setIsSaving] = useState(false)

  const dismiss = () => {
    // TODO(sheet-dismiss): see the matching TODO in join-by-code-sheet.tsx.
    if (sheetRef && typeof sheetRef !== 'function') sheetRef.current?.dismiss()
  }

  const handleSubmit = async (values: DisplayNameFormValues) => {
    setIsSaving(true)
    try {
      await actions.updateDisplayName.mutateAsync(values.displayName.trim())
      dismiss()
      onSaved()
    } catch (cause) {
      form.setError('root', { message: getRepositoryErrorText(cause) })
      setIsSaving(false)
    }
  }

  // The preview is derived from the watched field (forms.md: derive, don't
  // duplicate) - the member view with the email fallback when empty.
  const typedName = form.watch('displayName').trim()

  return (
    <View className="gap-4">
      <BottomSheetHeader title="Как вас видят участники" />

      <Controller
        control={form.control}
        name="displayName"
        render={({ field, fieldState }) => (
          <FormField>
            <FormLabel className={fieldState.error ? 'text-destructive' : undefined}>
              Отображаемое имя
            </FormLabel>
            <BottomSheetInput
              testID="settings-display-name-input"
              placeholder="Например, Юрий"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              autoCapitalize="sentences"
              maxLength={100}
              invalid={Boolean(fieldState.error)}
            />
            <FormError testID="settings-display-name-error">{fieldState.error?.message}</FormError>
          </FormField>
        )}
      />

      <Text
        variant="caption"
        className="text-muted-foreground"
        testID="settings-display-name-preview"
      >
        {typedName
          ? `Участники видят вас как: ${typedName}`
          : `Без имени участники видят ваш email: ${email}`}
      </Text>

      <FormError testID="settings-display-name-form-error">
        {form.formState.errors.root?.message}
      </FormError>

      <Button
        variant="primary"
        text="Сохранить"
        loading={isSaving || form.formState.isSubmitting}
        disabled={isSaving}
        onPress={form.handleSubmit(handleSubmit)}
        testID="settings-display-name-submit"
      />
    </View>
  )
}
