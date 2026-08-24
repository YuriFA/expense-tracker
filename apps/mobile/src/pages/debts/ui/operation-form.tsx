// The debt-operation form (new + edit variants, conventions forms.md):
// Долг ↔ Списание kind switch, direction segmented control (fixed when opened
// from a debtor's sheet), debtor picker, keypad-only amount, date picker,
// note, and the over-repayment warning (warn, never block). The amount stays
// a digit string in form values; the named mappers convert to int64 minor
// units exactly once at the submission boundary (forms.md §2/§4). Edit mode
// carries the record's CAS `version`; direction/kind/debtor are immutable
// server-side, so they render as static context rows.
//
// The root owns the form lifecycle and submission. Field sections subscribe
// to their own slice through useFormContext; the over-repayment warning reads
// the live amount, kind, and debtor selection in one isolated subscriber.

import { useEffect, useMemo, useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  FormProvider,
  useController,
  useForm,
  useFormContext,
  useFormState,
  useWatch,
} from 'react-hook-form'
import { Alert, View } from 'react-native'
import type {
  DebtDirection,
  DebtOperation,
  DebtOperationKind,
  DebtOperationRepository,
} from '@expense-tracker/api'
import { fullDayLabel } from '@expense-tracker/dates'
import { AmountKeypad, applyKeypadInput, type KeypadKey } from '@/features/create-transaction'
import {
  useCreateDebtOperation,
  useDeleteDebtOperation,
  useDebtors,
  useDebtOperations,
  useUpdateDebtOperation,
} from '@/entities/debt'
import { balanceInDirection } from '@/entities/debt/model/balances'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'
import { formatAmount } from '@/shared/lib/format/format'
import { parseMajorUnitsToMinor } from '@/shared/lib/money/parse'
import { minorToInputValue } from '@/shared/lib/money/display'
import { DatePickerSheet } from '@/shared/ui/date-picker-sheet'
import { BottomSheetHeader, BottomSheetInput, type BottomSheetRef } from '@/shared/ui/bottom-sheet'
import { Button } from '@/shared/ui/button'
import { FormError } from '@/shared/ui/form'
import { Icon } from '@/shared/ui/icon'
import { IconButton } from '@/shared/ui/icon-button'
import { Pressable } from '@/shared/ui/pressable'
import { Text } from '@/shared/ui/text'
import { cn } from '@/shared/lib/utils'
import { DEBTS_COPY, DEBT_DIRECTION_VIEWS, DEBT_KIND_LABELS } from '../model/kind'
import { operationDefaultValues, operationSchema, type OperationFormValues } from '../model/schema'
import { DebtorPickerSheet } from './debtor-picker-sheet'

interface OperationFormProps {
  /** The operation being edited; undefined = create mode. */
  operation?: DebtOperation
  /** Fixed context when opened from a debtor's history sheet. */
  fixed?: { debtorId: string; direction: DebtDirection }
  /** Initial kind for create mode (e.g. repayment from «Новое списание»). */
  defaultKind?: DebtOperationKind
  onSuccess: () => void
}

function toCreatePayload(
  values: OperationFormValues,
): Parameters<DebtOperationRepository['create']>[0] {
  return {
    debtorId: values.debtorId,
    direction: values.direction,
    kind: values.kind,
    // The schema's refine guarantees parseability; the fallback only
    // satisfies the parser's `number | null` return type.
    amount: parseMajorUnitsToMinor(values.amount) ?? 0,
    note: values.note.trim(),
    occurredAt: values.occurredAt,
  }
}

function toUpdatePayload(
  values: OperationFormValues,
  version: number,
): Parameters<DebtOperationRepository['update']>[1] {
  return {
    version,
    amount: parseMajorUnitsToMinor(values.amount) ?? 0,
    note: values.note.trim(),
    occurredAt: values.occurredAt,
  }
}

/** Two-option segmented control (the transaction type-switch idiom). */
function SegmentedSwitch<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  testIDPrefix: string
}) {
  return (
    <View className="flex-row rounded-xl bg-muted p-1" testID={testIDPrefix}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            testID={`${testIDPrefix}-${option.value}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={cn(
              'flex-1 items-center rounded-lg py-2',
              active ? 'bg-card shadow-sm' : undefined,
            )}
            onPress={() => onChange(option.value)}
          >
            <Text
              variant="body-sm"
              className={cn('font-medium', active ? 'text-foreground' : 'text-muted-foreground')}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Static context row for immutable fields in edit mode. */
function StaticRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text variant="body-sm" className="text-muted-foreground">
        {label}
      </Text>
      <Text variant="body" className="text-foreground" numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

/** The kind switch (create mode only) and, outside a fixed context, the
 * direction segmented control. One subscriber for both discriminator fields. */
function KindDirectionFields({ fixed }: { fixed?: OperationFormProps['fixed'] }) {
  const { control, setValue } = useFormContext<OperationFormValues>()
  const kind = useWatch({ control, name: 'kind' })
  const direction = useWatch({ control, name: 'direction' })

  return (
    <View className="gap-3">
      <SegmentedSwitch
        testIDPrefix="debts-operation-kind"
        value={kind}
        onChange={(next) => setValue('kind', next, { shouldValidate: true })}
        options={[
          { value: 'debt', label: DEBT_KIND_LABELS.debt },
          { value: 'repayment', label: DEBT_KIND_LABELS.repayment },
        ]}
      />
      {fixed ? (
        <StaticRow label="Направление" value={DEBT_DIRECTION_VIEWS[fixed.direction].summaryLabel} />
      ) : (
        <SegmentedSwitch
          testIDPrefix="debts-operation-direction"
          value={direction}
          onChange={(next) => setValue('direction', next, { shouldValidate: true })}
          options={[
            { value: 'receivable', label: DEBT_DIRECTION_VIEWS.receivable.summaryLabel },
            { value: 'payable', label: DEBT_DIRECTION_VIEWS.payable.summaryLabel },
          ]}
        />
      )}
    </View>
  )
}

/** The debtor picker row plus its sheet (create mode without a fixed debtor). */
function DebtorField() {
  const { control, setValue } = useFormContext<OperationFormValues>()
  const { field, fieldState } = useController({ name: 'debtorId', control })
  const debtors = useDebtors().data ?? []
  const pickerRef = useRef<BottomSheetRef>(null)
  const selected = debtors.find((debtor) => debtor.id === field.value)

  return (
    <>
      <Pressable
        testID="debts-operation-debtor"
        accessibilityRole="button"
        accessibilityLabel={`Должник: ${selected?.name ?? 'не выбран'}`}
        className="flex-row items-center gap-3 py-3.5"
        onPress={() => pickerRef.current?.present()}
      >
        <Icon name="person-outline" size={20} colorClassName="accent-muted-foreground" />
        <Text variant="body" className="text-muted-foreground">
          Должник
        </Text>
        <Text
          variant="body"
          className={cn(
            'flex-1 text-right',
            selected && !fieldState.error ? 'text-foreground' : 'text-muted-foreground',
          )}
          numberOfLines={1}
        >
          {selected?.name ?? 'Выберите должника'}
        </Text>
        <Icon name="chevron-forward" size={16} colorClassName="accent-muted-foreground" />
      </Pressable>
      <FormError testID="debts-operation-debtor-error">{fieldState.error?.message}</FormError>
      <DebtorPickerSheet
        ref={pickerRef}
        debtors={debtors}
        selectedId={field.value}
        onSelect={(id) => setValue('debtorId', id, { shouldValidate: true })}
      />
    </>
  )
}

/** The amount display (keypad-driven) with its validation error. */
function AmountField() {
  const { control } = useFormContext<OperationFormValues>()
  const { field, fieldState } = useController({ name: 'amount', control })

  return (
    <View className="gap-1 pt-2">
      <Text variant="h1" className="text-center text-foreground" testID="debts-operation-amount">
        {field.value ? field.value.replace('.', ',') : '0'}
      </Text>
      <FormError testID="debts-operation-amount-error">{fieldState.error?.message}</FormError>
    </View>
  )
}

/** Date row + its picker sheet (the edit-transaction DateFieldRow idiom). */
function DateField() {
  const { control, setValue } = useFormContext<OperationFormValues>()
  const { field } = useController({ name: 'occurredAt', control })
  const pickerRef = useRef<BottomSheetRef>(null)
  // `new Date('')` is an Invalid Date that crashes the calendar; the schema
  // default always seeds "now".
  const selectedDate = useMemo(
    () => (field.value ? new Date(field.value) : new Date()),
    [field.value],
  )

  return (
    <>
      <Pressable
        testID="debts-operation-date"
        accessibilityRole="button"
        accessibilityLabel={`Дата: ${field.value ? fullDayLabel(field.value) : 'не выбрана'}`}
        className="flex-row items-center gap-3 py-3.5"
        onPress={() => pickerRef.current?.present()}
      >
        <Icon name="calendar-outline" size={20} colorClassName="accent-muted-foreground" />
        <Text variant="body" className="text-muted-foreground">
          Дата
        </Text>
        <Text variant="body" className="flex-1 text-right text-foreground" numberOfLines={1}>
          {field.value ? fullDayLabel(field.value) : 'Выберите дату'}
        </Text>
        <Icon name="chevron-forward" size={16} colorClassName="accent-muted-foreground" />
      </Pressable>
      <DatePickerSheet
        ref={pickerRef}
        selected={selectedDate}
        onSelect={(date: Date) =>
          setValue('occurredAt', date.toISOString(), { shouldValidate: true })
        }
      />
    </>
  )
}

/** Note input (the only native keyboard field). */
function NoteField() {
  const { control } = useFormContext<OperationFormValues>()
  const { field } = useController({ name: 'note', control })
  return (
    <BottomSheetInput
      testID="debts-operation-note"
      placeholder="Заметка"
      value={field.value}
      onChangeText={field.onChange}
    />
  )
}

/**
 * Over-repayment warning (isolated subscriber): fires when a repayment's
 * parsed amount exceeds the debtor's remaining balance in the direction.
 * Warns only - the operation is accepted (debts capability D2).
 */
function OverRepaymentWarning() {
  const { control } = useFormContext<OperationFormValues>()
  const kind = useWatch({ control, name: 'kind' })
  const debtorId = useWatch({ control, name: 'debtorId' })
  const direction = useWatch({ control, name: 'direction' })
  const amount = useWatch({ control, name: 'amount' })
  const operations = useDebtOperations().data ?? []

  if (kind !== 'repayment' || !debtorId) return null
  const minor = parseMajorUnitsToMinor(amount ?? '')
  if (minor === null || minor <= 0) return null

  const remaining = balanceInDirection(operations, debtorId, direction)
  if (minor <= remaining) return null

  return (
    <Text variant="caption" className="text-warning" testID="debts-operation-over-repayment">
      {DEBTS_COPY.overRepayment(formatAmount(remaining))}
    </Text>
  )
}

export function OperationForm({ operation, fixed, defaultKind, onSuccess }: OperationFormProps) {
  const editing = operation !== undefined
  const debtors = useDebtors().data ?? []

  const defaults = useMemo<OperationFormValues>(() => {
    if (operation) {
      return {
        kind: operation.kind,
        direction: operation.direction,
        debtorId: operation.debtorId,
        amount: minorToInputValue(operation.amount),
        occurredAt: operation.occurredAt,
        note: operation.note,
      }
    }
    return operationDefaultValues({
      kind: defaultKind ?? 'debt',
      direction: fixed?.direction ?? 'receivable',
      debtorId: fixed?.debtorId ?? '',
    })
  }, [operation, fixed, defaultKind])

  const form = useForm<OperationFormValues>({
    resolver: zodResolver(operationSchema),
    defaultValues: defaults,
    mode: 'onChange',
  })
  const createOperation = useCreateDebtOperation()
  const updateOperation = useUpdateDebtOperation()
  const deleteOperation = useDeleteDebtOperation()
  const pending =
    createOperation.isPending || updateOperation.isPending || deleteOperation.isPending

  // Sheets stay mounted in @gorhom, so prefill/reset must be explicit
  // (forms.md §3); trigger() recomputes validity for the fresh defaults.
  useEffect(() => {
    form.reset(defaults)
    void form.trigger()
  }, [defaults, form])

  const handleAmountKey = (key: KeypadKey) => {
    form.setValue('amount', applyKeypadInput(form.getValues('amount'), key), {
      shouldValidate: true,
    })
  }

  const handleDeleteConfirm = async () => {
    if (!operation) return
    try {
      await deleteOperation.mutateAsync(operation.id)
      onSuccess()
    } catch (cause) {
      form.setError('root', { message: getRepositoryErrorText(cause) })
    }
  }

  const handleDelete = () => {
    // TODO(i18n): RU wording until mobile i18n wiring lands.
    Alert.alert('Удалить операцию?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => void handleDeleteConfirm() },
    ])
  }

  const handleSubmit = async (values: OperationFormValues) => {
    try {
      if (operation) {
        await updateOperation.mutateAsync({
          id: operation.id,
          payload: toUpdatePayload(values, operation.version),
        })
      } else {
        await createOperation.mutateAsync(toCreatePayload(values))
        form.reset(defaults)
      }
      onSuccess()
    } catch (cause) {
      form.setError('root', { message: getRepositoryErrorText(cause) })
    }
  }

  const selectedDebtor = operation
    ? debtors.find((debtor) => debtor.id === operation.debtorId)
    : undefined

  return (
    <FormProvider {...form}>
      <View className="flex-1">
        <BottomSheetHeader
          title={editing ? 'Операция' : 'Новая операция'}
          right={
            editing ? (
              <IconButton
                icon="trash-outline"
                size="md"
                colorClassName="accent-destructive"
                accessibilityLabel="Удалить операцию"
                testID="debts-operation-delete"
                disabled={pending}
                onPress={handleDelete}
              />
            ) : undefined
          }
        />
        <View className="flex-1 gap-3 px-4">
          {editing ? (
            <View className="gap-1">
              <StaticRow label="Должник" value={selectedDebtor?.name ?? operation.debtorId} />
              <StaticRow
                label="Направление"
                value={DEBT_DIRECTION_VIEWS[operation.direction].summaryLabel}
              />
              <StaticRow label="Тип" value={DEBT_KIND_LABELS[operation.kind]} />
            </View>
          ) : (
            <KindDirectionFields fixed={fixed} />
          )}

          {!editing && !fixed ? <DebtorField /> : null}

          <AmountField />

          <DateField />
          <NoteField />

          {!editing && debtors.length === 0 ? (
            <View className="flex-row items-center gap-2">
              <Icon name="information-circle" size={16} colorClassName="accent-muted-foreground" />
              <Text variant="caption" className="flex-1 text-muted-foreground">
                Чтобы записать операцию, сначала добавьте должника
              </Text>
            </View>
          ) : null}

          <OverRepaymentWarning />

          <FormError testID="debts-operation-error">
            {form.formState.errors.root?.message}
          </FormError>

          <OperationSubmitField
            pending={pending}
            text={editing ? 'Сохранить' : 'Добавить'}
            onSubmit={form.handleSubmit(handleSubmit)}
          />
        </View>

        <AmountKeypad onKey={handleAmountKey} testIDPrefix="debts-operation" />
      </View>
    </FormProvider>
  )
}

/** The submit button, isolated: it alone subscribes to form validity. */
function OperationSubmitField({
  pending,
  text,
  onSubmit,
}: {
  pending: boolean
  text: string
  onSubmit: () => void
}) {
  const { control } = useFormContext<OperationFormValues>()
  const { isValid, isSubmitting } = useFormState({ control })
  const blocked = pending || isSubmitting

  return (
    <Button
      variant="primary"
      text={text}
      className="mt-2"
      testID="debts-operation-submit"
      loading={blocked}
      disabled={!isValid || blocked}
      onPress={onSubmit}
    />
  )
}
