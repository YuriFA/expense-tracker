// Invite-by-email sheet (household-ux 2.2, owner only): one email field with
// inline validation; the backend refreshes (never duplicates) a pending
// invitation for the same email. Mirrors the join-by-code sheet (forms.md
// §1/§3): the sheet owns its lifecycle, the form owns submission state.
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
import { inviteMemberSchema, type InviteMemberFormValues } from '../model/schema'

export interface HouseholdInviteSheetProps {
  onClose: () => void
}

export function HouseholdInviteSheet({ onClose }: HouseholdInviteSheetProps) {
  const sheetRef = useRef<BottomSheetRef>(null)

  return (
    <BottomSheet
      ref={sheetRef}
      presentOnMount
      testID="settings-household-invite-sheet"
      snapPoints={['40%']}
      stackBehavior="push"
      onDismiss={onClose}
    >
      <BottomSheetView testID="settings-household-invite-sheet">
        <BottomSheetBody>
          <InviteForm sheetRef={sheetRef} onInvited={onClose} />
        </BottomSheetBody>
      </BottomSheetView>
    </BottomSheet>
  )
}

function InviteForm({
  sheetRef,
  onInvited,
}: {
  sheetRef: React.Ref<BottomSheetRef>
  onInvited: () => void
}) {
  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '' },
    mode: 'onChange',
  })
  const actions = useHouseholdActions()
  const [isInviting, setIsInviting] = useState(false)

  const dismiss = () => {
    // TODO(sheet-dismiss): see the matching TODO in join-by-code-sheet.tsx.
    if (sheetRef && typeof sheetRef !== 'function') sheetRef.current?.dismiss()
  }

  const handleSubmit = async (values: InviteMemberFormValues) => {
    setIsInviting(true)
    try {
      await actions.invite.mutateAsync(values.email.trim())
      dismiss()
      onInvited()
    } catch (cause) {
      form.setError('root', { message: getRepositoryErrorText(cause) })
      setIsInviting(false)
    }
  }

  return (
    <View className="gap-4">
      <BottomSheetHeader title="Пригласить участника" />

      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <FormField>
            <FormLabel className={fieldState.error ? 'text-destructive' : undefined}>
              Email
            </FormLabel>
            <BottomSheetInput
              testID="settings-household-invite-input"
              placeholder="wife@example.com"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              invalid={Boolean(fieldState.error)}
            />
            <FormError testID="settings-household-invite-error">
              {fieldState.error?.message}
            </FormError>
          </FormField>
        )}
      />

      <FormError testID="settings-household-invite-form-error">
        {form.formState.errors.root?.message}
      </FormError>

      <Button
        variant="primary"
        text="Отправить приглашение"
        loading={isInviting || form.formState.isSubmitting}
        disabled={isInviting}
        onPress={form.handleSubmit(handleSubmit)}
        testID="settings-household-invite-submit"
      />
    </View>
  )
}
