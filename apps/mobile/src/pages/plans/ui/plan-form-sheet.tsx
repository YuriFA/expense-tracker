// Plan add/edit form + sheet (conventions forms.md §2/§3, design D7): one
// discriminated-union schema whose `type` arm is fixed from the tapped card,
// a decimal-pad amount input with the selected account's currency chip (₽
// fallback — the edit-transaction amount idiom), an optional name, and the
// reference field rows (leading icon, muted label left, value right,
// chevron): account/category picker rows (category type-filtered), a
// next-due calendar row with NO lower bound (past dates are legal — a plan
// may start already overdue), and regularity / confirmation-mode / reminder
// rows opening single-choice option sheets. The note is an inline input
// row; the footer carries only the circular submit over `pb-safe`.
// The amount stays a digit string in form values (sanitized on input,
// grouping is display-only); the named mappers convert to int64 minor
// units exactly once at the submission boundary (forms.md §4).
//
// The root owns the form lifecycle and submission; field sections subscribe
// to their own slice through useFormContext (forms.md §8). Edit mode carries
// the record's CAS `version` and a delete affordance; the plan's `type` is
// immutable server-side and arrives only as the fixed variant context.

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
import { currencySymbol } from '@expense-tracker/money'
import type { PlannedPayment, PlannedPaymentType } from '@expense-tracker/api'
import { useAccounts } from '@/entities/account'
import { useCategories } from '@/entities/category'
import {
  useCreatePlannedPayment,
  useDeletePlannedPayment,
  useUpdatePlannedPayment,
  requestNotificationPermissions,
} from '@/entities/planned-payment'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'
import { groupAmountInput, minorToInputValue } from '@/shared/lib/money/display'
import { sanitizeAmountInput } from '@/shared/lib/money/parse'
import { AccountPickerSheet } from '@/shared/ui/account-picker-sheet'
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetInput,
  BottomSheetScrollView,
  type BottomSheetRef,
} from '@/shared/ui/bottom-sheet'
import { CategoryPickerSheet } from '@/shared/ui/category-picker-sheet'
import { FormError } from '@/shared/ui/form'
import { SheetContentPortal, useSheetContentPickers } from '@/shared/ui/sheet-content-portal'
import { Icon, type IconName } from '@/shared/ui/icon'
import { IconButton } from '@/shared/ui/icon-button'
import { Text } from '@/shared/ui/text'
import { cn } from '@/shared/lib/utils'
import {
  PLANS_CONFIRM_MODE_DESCRIPTIONS,
  PLANS_CONFIRM_MODE_LABELS,
  PLANS_REGULARITY_OPTIONS,
  PLANS_REMINDER_LABELS,
  PLAN_TYPE_VIEWS,
} from '../model/kind'
import {
  planFormDefaultValues,
  planFormSchema,
  toCreatePayload,
  toUpdatePayload,
  type PlanFormValues,
} from '../model/schema'
import { PlansFormFooter } from './form-actions'
import { PlansDateFieldRow, PlansFieldRow, PlansNoteFieldRow } from './form-rows'
import { OptionPickerSheet, type OptionItem } from './option-picker-sheet'

/** Either a create (type fixed from the card) or an edit (its plan). */
export type PlanFormSheetProps =
  | { type: PlannedPaymentType; plan?: undefined }
  | { type?: undefined; plan: PlannedPayment }

export function PlanFormSheet(props: PlanFormSheetProps) {
  // Both variants mount fresh with their subject and self-present (the
  // new-debtor-debt pattern): a parent-side present() would race the
  // conditional mount and be lost.
  const sheetRef = useRef<BottomSheetRef>(null)
  // The pickers declared by the rows below re-render beside this sheet
  // element (outside its portal content) — see useSheetContentPickers.
  const pickers = useSheetContentPickers()
  useEffect(() => {
    sheetRef.current?.present()
  }, [])

  const view = PLAN_TYPE_VIEWS[props.plan ? props.plan.type : props.type]

  const defaults = useMemo<PlanFormValues>(() => {
    if (props.plan) {
      const plan = props.plan
      return {
        type: plan.type,
        amount: minorToInputValue(plan.amount),
        name: plan.name,
        accountId: plan.accountId,
        categoryId: plan.categoryId,
        nextDue: plan.nextDue,
        regularity: plan.regularity,
        confirmMode: plan.confirmMode,
        reminder: plan.reminder,
        note: plan.note,
      }
    }
    return planFormDefaultValues(props.type)
    // Stable page state in both variants - defaults must not re-derive per
    // render, or the reset effect below would wipe the user's typing.
  }, [props.plan, props.type])

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: defaults,
    mode: 'onChange',
  })
  const createPlan = useCreatePlannedPayment()
  const updatePlan = useUpdatePlannedPayment()
  const deletePlan = useDeletePlannedPayment()
  const pending = createPlan.isPending || updatePlan.isPending || deletePlan.isPending

  // Sheets stay mounted in @gorhom, so prefill/reset must be explicit
  // (forms.md §3); trigger() recomputes validity for the fresh defaults.
  useEffect(() => {
    form.reset(defaults)
    void form.trigger()
  }, [defaults, form])

  const dismiss = () => {
    // TODO(sheet-dismiss): see the matching TODO in
    // pages/debts/ui/new-debtor-debt-sheet.tsx.
    if (sheetRef && typeof sheetRef !== 'function') sheetRef.current?.dismiss()
  }

  const handleDeleteConfirm = async () => {
    if (!props.plan) return
    try {
      await deletePlan.mutateAsync(props.plan.id)
      dismiss()
    } catch (cause) {
      form.setError('root', { message: getRepositoryErrorText(cause) })
    }
  }

  const handleDelete = () => {
    // TODO(i18n): RU wording until mobile i18n wiring lands.
    Alert.alert('Удалить план?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => void handleDeleteConfirm() },
    ])
  }

  const handleSubmit = async (values: PlanFormValues) => {
    try {
      if (props.plan) {
        await updatePlan.mutateAsync({
          id: props.plan.id,
          payload: toUpdatePayload(values, props.plan.version),
        })
      } else {
        await createPlan.mutateAsync(toCreatePayload(values))
        form.reset(defaults)
      }
      dismiss()
    } catch (cause) {
      form.setError('root', { message: getRepositoryErrorText(cause) })
    }
  }

  return (
    <>
      {pickers.nodes}
      <BottomSheet
        ref={sheetRef}
        snapPoints={['75%']}
        stackBehavior="push"
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        footerComponent={() => (
          <FormProvider {...form}>
            <PlansFormFooter
              testID="plans-form-submit"
              accessibilityLabel="Сохранить план"
              pending={pending}
              onSubmit={form.handleSubmit(handleSubmit)}
            />
          </FormProvider>
        )}
      >
        <pickers.Provider>
          <FormProvider {...form}>
            <BottomSheetHeader
              title={props.plan ? view.editTitle : view.addTitle}
              right={
                props.plan ? (
                  <IconButton
                    icon="trash-outline"
                    size="md"
                    colorClassName="accent-destructive"
                    accessibilityLabel="Удалить план"
                    testID="plans-form-delete"
                    disabled={pending}
                    onPress={handleDelete}
                  />
                ) : undefined
              }
            />

            <AmountField />

            {/* The visible element carrying the sheet testID (accounts-sheet
            pattern): the modal container is zero-bounds to Maestro. */}
            <BottomSheetScrollView
              testID="plans-form-sheet"
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}
            >
              <NameField />
              <AccountRow label={view.accountLabel} />
              <CategoryRow />
              <PlansDateFieldRow field="nextDue" testID="plans-form-date" />
              <OptionFieldRow
                label="Повтор"
                icon="repeat-outline"
                field="regularity"
                testID="plans-form-regularity"
                options={[
                  { value: 'daily', label: PLANS_REGULARITY_OPTIONS.daily },
                  { value: 'weekly', label: PLANS_REGULARITY_OPTIONS.weekly },
                  { value: 'monthly', label: PLANS_REGULARITY_OPTIONS.monthly },
                  { value: 'yearly', label: PLANS_REGULARITY_OPTIONS.yearly },
                ]}
              />
              <OptionFieldRow
                label="Подтверждение"
                icon="checkmark-circle-outline"
                field="confirmMode"
                testID="plans-form-confirm-mode"
                options={[
                  {
                    value: 'manual',
                    label: PLANS_CONFIRM_MODE_LABELS.manual,
                    caption: PLANS_CONFIRM_MODE_DESCRIPTIONS.manual,
                  },
                  {
                    value: 'auto',
                    label: PLANS_CONFIRM_MODE_LABELS.auto,
                    caption: PLANS_CONFIRM_MODE_DESCRIPTIONS.auto,
                  },
                ]}
              />
              <OptionFieldRow
                label="Напоминание"
                icon="notifications-outline"
                field="reminder"
                testID="plans-form-reminder"
                options={[
                  { value: 'off', label: PLANS_REMINDER_LABELS.off },
                  { value: 'day_before', label: PLANS_REMINDER_LABELS.day_before },
                  { value: 'on_day', label: PLANS_REMINDER_LABELS.on_day },
                ]}
                onValueChange={(next, previous) => {
                  // Permission is requested when a reminder is first enabled;
                  // denial is silent — the setting is stored and synced anyway and
                  // the scheduler no-ops (design D9).
                  if (previous === 'off' && next !== 'off') {
                    void requestNotificationPermissions()
                  }
                }}
              />
              <PlansNoteFieldRow testID="plans-form-note" />

              <RootError />
            </BottomSheetScrollView>
          </FormProvider>
        </pickers.Provider>
      </BottomSheet>
    </>
  )
}

/** The required positive amount with the account's currency chip beside it. */
function AmountField() {
  const { control, setValue } = useFormContext<PlanFormValues>()
  const { field, fieldState } = useController({ name: 'amount', control })
  const accounts = useAccounts().data ?? []
  const accountId = useWatch({ control, name: 'accountId' })
  // The plan's account owns the amount's currency; ₽ leads before one is
  // chosen (design D7).
  const currency = accounts.find((account) => account.id === accountId)?.currency ?? 'RUB'

  return (
    <View className="gap-1 px-4 pt-2">
      <View className="flex-row items-center gap-3 rounded-2xl bg-secondary px-4 py-3">
        <View className="flex-1">
          <BottomSheetInput
            testID="plans-form-amount"
            className="border-0 bg-transparent px-0 py-1 text-3xl font-bold"
            accessibilityLabel="Сумма"
            keyboardType="decimal-pad"
            placeholder="0"
            value={groupAmountInput(field.value)}
            onChangeText={(text) =>
              setValue('amount', sanitizeAmountInput(text), { shouldValidate: true })
            }
            invalid={Boolean(fieldState.error)}
          />
        </View>
        <Text variant="h3" className="text-muted-foreground" testID="plans-form-currency">
          {currencySymbol(currency)}
        </Text>
      </View>
      <FormError testID="plans-form-amount-error">{fieldState.error?.message}</FormError>
    </View>
  )
}

/** The optional name (an empty string means an unnamed plan). */
function NameField() {
  const { control } = useFormContext<PlanFormValues>()
  const { field } = useController({ name: 'name', control })

  return (
    <BottomSheetInput
      testID="plans-form-name"
      placeholder="Название (необязательно)"
      value={field.value}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
    />
  )
}

/** The required account row («Счёт списания» / «Счёт зачисления») + picker. */
function AccountRow({ label }: { label: string }) {
  const { control, setValue } = useFormContext<PlanFormValues>()
  const { field, fieldState } = useController({ name: 'accountId', control })
  const accounts = useAccounts().data ?? []
  const selected = accounts.find((account) => account.id === field.value)
  const pickerRef = useRef<BottomSheetRef>(null)

  return (
    <>
      <PlansFieldRow
        label={label}
        value={selected?.name}
        placeholder="Выберите счёт"
        leadingIcon={
          <Icon name="card-outline" size={20} colorClassName="accent-muted-foreground" />
        }
        onPress={() => pickerRef.current?.present()}
        testID="plans-form-account"
        invalid={Boolean(fieldState.error)}
      />
      <SheetContentPortal>
        <AccountPickerSheet
          ref={pickerRef}
          title={label}
          accounts={accounts}
          selectedId={field.value ?? ''}
          onSelect={(id) => setValue('accountId', id, { shouldValidate: true })}
          testIDPrefix="plans-form-account"
        />
      </SheetContentPortal>
    </>
  )
}

/** The required type-matched category row (colored icon) + picker. */
function CategoryRow() {
  const { control, setValue } = useFormContext<PlanFormValues>()
  const { field, fieldState } = useController({ name: 'categoryId', control })
  const typeField = useController({ name: 'type', control })
  const categories = useCategories(typeField.field.value).data ?? []
  const selected = categories.find((category) => category.id === field.value)
  const pickerRef = useRef<BottomSheetRef>(null)

  return (
    <>
      <PlansFieldRow
        label="Категория"
        value={selected?.name}
        placeholder="Выберите категорию"
        leadingIcon={
          <View
            className={cn(
              'size-5 items-center justify-center rounded-full',
              selected ? undefined : 'bg-muted',
            )}
            style={selected ? { backgroundColor: selected.color } : undefined}
          >
            <Icon
              name={(selected?.icon ?? 'pricetag-outline') as IconName}
              size={12}
              colorClassName="accent-white"
            />
          </View>
        }
        onPress={() => pickerRef.current?.present()}
        testID="plans-form-category"
        invalid={Boolean(fieldState.error)}
      />
      <SheetContentPortal>
        <CategoryPickerSheet
          ref={pickerRef}
          categories={categories}
          selectedId={field.value ?? ''}
          onSelect={(id) => setValue('categoryId', id, { shouldValidate: true })}
        />
      </SheetContentPortal>
    </>
  )
}

type OptionField = 'regularity' | 'confirmMode' | 'reminder'

/**
 * A field row opening a single-choice option sheet. It subscribes only to
 * its own field, so a pick never re-renders the rest of the form
 * (forms.md §8). `onValueChange` observes transitions before the field is
 * written (e.g. the reminder permission request).
 */
function OptionFieldRow({
  label,
  icon,
  field,
  testID,
  options,
  onValueChange,
}: {
  label: string
  icon: IconName
  field: OptionField
  testID: string
  options: ReadonlyArray<OptionItem<PlanFormValues[OptionField]>>
  onValueChange?: (next: PlanFormValues[OptionField], previous: PlanFormValues[OptionField]) => void
}) {
  const { control, setValue } = useFormContext<PlanFormValues>()
  const { field: fieldState } = useController({ name: field, control })
  const sheetRef = useRef<BottomSheetRef>(null)
  const selected = options.find((option) => option.value === fieldState.value)

  return (
    <>
      <PlansFieldRow
        label={label}
        value={selected?.label}
        placeholder="—"
        leadingIcon={<Icon name={icon} size={20} colorClassName="accent-muted-foreground" />}
        onPress={() => sheetRef.current?.present()}
        testID={testID}
      />
      <SheetContentPortal>
        <OptionPickerSheet
          ref={sheetRef}
          title={label}
          options={options}
          selected={fieldState.value}
          onSelect={(next) => {
            onValueChange?.(next, fieldState.value)
            setValue(field, next)
          }}
          testIDPrefix={testID}
        />
      </SheetContentPortal>
    </>
  )
}

/** The form-level (repository) error slot, isolated. */
function RootError() {
  const { control } = useFormContext<PlanFormValues>()
  const { errors } = useFormState({ control })

  return <FormError testID="plans-form-error">{errors.root?.message}</FormError>
}
