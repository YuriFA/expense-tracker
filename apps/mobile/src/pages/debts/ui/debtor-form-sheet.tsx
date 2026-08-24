// Debtor create/edit form + sheet (conventions forms.md §1/§3): name and
// note; the edit variant carries delete with a confirm alert. Rename
// conflicts surface through the shared code-keyed error mapping
// (repository-errors-ru), CAS `version` on update.

import { useEffect, useMemo } from 'react'
import { Alert } from 'react-native'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, FormProvider, useForm, useFormContext, useFormState } from 'react-hook-form'
import { View } from 'react-native'
import type { Debtor } from '@expense-tracker/api'
import { useCreateDebtor, useDeleteDebtor, useUpdateDebtor } from '@/entities/debt'
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
import { IconButton } from '@/shared/ui/icon-button'
import { debtorSchema, type DebtorFormValues } from '../model/schema'

export interface DebtorFormSheetProps {
  ref: React.Ref<BottomSheetRef>
  /** The debtor being edited; undefined = create mode. */
  debtor?: Debtor
}

export function DebtorFormSheet({ ref, debtor }: DebtorFormSheetProps) {
  // The edit variant mounts WITH its subject (a parent-side present() would
  // race the conditional mount and be lost); the create variant is presented
  // imperatively by the page.
  useEffect(() => {
    if (debtor && ref && typeof ref !== 'function') ref.current?.present()
  }, [debtor, ref])

  const sheetTestId = debtor ? 'debts-edit-debtor-sheet' : 'debts-new-debtor-sheet'
  return (
    <BottomSheet ref={ref} testID={sheetTestId} snapPoints={['55%']} stackBehavior="push">
      {/* The visible element carrying the sheet testID (the accounts-sheet
          pattern): the modal container itself is zero-bounds to Maestro. */}
      <BottomSheetView testID={sheetTestId}>
        <BottomSheetBody>
          <DebtorForm debtor={debtor} sheetRef={ref} />
        </BottomSheetBody>
      </BottomSheetView>
    </BottomSheet>
  )
}

// The header renders inside the form (the edit-transaction layout): the title
// reflects the mode and the edit variant carries delete on the right.

/** The submit button, isolated: it alone subscribes to form validity. */
function DebtorSubmitField({
  pending,
  text,
  onSubmit,
}: {
  pending: boolean
  text: string
  onSubmit: () => void
}) {
  const { control } = useFormContext<DebtorFormValues>()
  const { isValid, isSubmitting } = useFormState({ control })
  const blocked = pending || isSubmitting

  return (
    <Button
      variant="primary"
      text={text}
      testID="debts-debtor-submit"
      loading={blocked}
      disabled={!isValid || blocked}
      onPress={onSubmit}
    />
  )
}

export function DebtorForm({
  debtor,
  sheetRef,
}: {
  debtor?: Debtor
  sheetRef: React.Ref<BottomSheetRef>
}) {
  const editing = debtor !== undefined

  const defaults = useMemo<DebtorFormValues>(
    () => ({ name: debtor?.name ?? '', note: debtor?.note ?? '' }),
    [debtor],
  )

  const form = useForm<DebtorFormValues>({
    resolver: zodResolver(debtorSchema),
    defaultValues: defaults,
    mode: 'onChange',
  })
  const createDebtor = useCreateDebtor()
  const updateDebtor = useUpdateDebtor()
  const deleteDebtor = useDeleteDebtor()
  const pending = createDebtor.isPending || updateDebtor.isPending || deleteDebtor.isPending

  // Sheets stay mounted in @gorhom, so prefill must be an explicit reset
  // (forms.md §3); trigger() recomputes validity for the fresh defaults.
  useEffect(() => {
    form.reset(defaults)
    void form.trigger()
  }, [defaults, form])

  const dismiss = () => {
    // TODO(sheet-dismiss): see the matching TODO in
    // features/cashflow-overview/ui/edit-category-sheet.tsx.
    if (sheetRef && typeof sheetRef !== 'function') sheetRef.current?.dismiss()
  }

  const handleSubmit = async (values: DebtorFormValues) => {
    try {
      if (debtor) {
        await updateDebtor.mutateAsync({
          id: debtor.id,
          // The form always carries the full note state: an untouched value
          // re-sends the same string, an emptied field clears it (D3).
          payload: { name: values.name, note: values.note, version: debtor.version },
        })
      } else {
        await createDebtor.mutateAsync({ name: values.name, note: values.note })
        form.reset(defaults)
      }
      dismiss()
    } catch (cause) {
      form.setError('root', { message: getRepositoryErrorText(cause) })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!debtor) return
    try {
      await deleteDebtor.mutateAsync(debtor.id)
      dismiss()
    } catch (cause) {
      form.setError('root', { message: getRepositoryErrorText(cause) })
    }
  }

  const handleDelete = () => {
    // TODO(i18n): RU wording until mobile i18n wiring lands.
    Alert.alert('Удалить должника?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => void handleDeleteConfirm() },
    ])
  }

  return (
    <FormProvider {...form}>
      <View className="gap-4">
        <BottomSheetHeader
          title={editing ? 'Должник' : 'Новый должник'}
          right={
            editing ? (
              <IconButton
                icon="trash-outline"
                size="md"
                colorClassName="accent-destructive"
                accessibilityLabel="Удалить должника"
                testID="debts-debtor-delete"
                disabled={pending}
                onPress={handleDelete}
              />
            ) : undefined
          }
        />

        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <FormField>
              <FormLabel className={fieldState.error ? 'text-destructive' : undefined}>
                Имя
              </FormLabel>
              <BottomSheetInput
                testID="debts-debtor-name"
                placeholder="Имя"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(fieldState.error)}
              />
              <FormError testID="debts-debtor-name-error">{fieldState.error?.message}</FormError>
            </FormField>
          )}
        />

        <Controller
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormField>
              <FormLabel>Заметка</FormLabel>
              <BottomSheetInput
                testID="debts-debtor-note"
                placeholder="Заметка (необязательно)"
                value={field.value}
                onChangeText={field.onChange}
              />
            </FormField>
          )}
        />

        <FormError testID="debts-debtor-error">{form.formState.errors.root?.message}</FormError>

        <DebtorSubmitField
          pending={pending}
          text={editing ? 'Сохранить' : 'Добавить'}
          onSubmit={form.handleSubmit(handleSubmit)}
        />
      </View>
    </FormProvider>
  )
}
