// The plans forms' shared field rows (the edit-transaction field-rows
// idiom, design D7): one concern per line — a leading icon with a muted
// label on the left, the value and a chevron on the right — plus the
// calendar date row and the inline note input row that the add/edit form
// and the manual confirm sheet share. Each row section subscribes to its
// own form slice and mounts its sheet itself (always mounted, so rows
// never unmount an open sheet).

import { useRef } from 'react'
import { useController, useFormContext } from 'react-hook-form'
import { calendarDayKey } from '@expense-tracker/dates'
import { BottomSheetInput, type BottomSheetRef } from '@/shared/ui/bottom-sheet'
import { DatePickerSheet } from '@/shared/ui/date-picker-sheet'
import { Icon } from '@/shared/ui/icon'
import { Pressable } from '@/shared/ui/pressable'
import { SheetContentPortal } from '@/shared/ui/sheet-content-portal'
import { Text } from '@/shared/ui/text'
import { cn } from '@/shared/lib/utils'
import { nextDueLabel } from '../model/selectors'

type DateField = 'nextDue' | 'occurredOn'

/**
 * The reactive slice both plans schemas share with these rows: the add/edit
 * form structurally carries `nextDue` + `note`, the confirm sheet
 * `occurredOn` + `note` (the date FIELD name differs, like the former
 * toolbar's fixed slice).
 */
interface PlansRowValues {
  nextDue: string
  occurredOn: string
  note: string
}

/** A one-line picker row: leading icon, muted label left, value right, chevron. */
export function PlansFieldRow({
  label,
  value,
  placeholder,
  leadingIcon,
  onPress,
  testID,
  invalid = false,
}: {
  label: string
  value: string | undefined
  placeholder: string
  leadingIcon: React.ReactNode
  onPress: () => void
  testID: string
  invalid?: boolean
}) {
  const isPlaceholder = value === undefined

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value ?? placeholder}`}
      className="flex-row items-center gap-3 py-3.5"
      onPress={onPress}
    >
      {leadingIcon}
      <Text variant="body" className="text-muted-foreground">
        {label}
      </Text>
      <Text
        variant="body"
        className={cn(
          'flex-1 text-right',
          isPlaceholder || invalid ? 'text-muted-foreground' : 'text-foreground',
        )}
        numberOfLines={1}
      >
        {value ?? placeholder}
      </Text>
      <Icon name="chevron-forward" size={16} colorClassName="accent-muted-foreground" />
    </Pressable>
  )
}

/** The calendar date row plus its always-mounted sheet (field name per form). */
export function PlansDateFieldRow({ field, testID }: { field: DateField; testID: string }) {
  const { control, setValue } = useFormContext<PlansRowValues>()
  const { field: dateField } = useController({ name: field, control })
  const pickerRef = useRef<BottomSheetRef>(null)

  return (
    <>
      <PlansFieldRow
        label="Дата"
        value={nextDueLabel(dateField.value)}
        placeholder="Выберите дату"
        leadingIcon={
          <Icon name="calendar-outline" size={20} colorClassName="accent-muted-foreground" />
        }
        onPress={() => pickerRef.current?.present()}
        testID={testID}
      />
      <SheetContentPortal>
        <DatePickerSheet
          ref={pickerRef}
          selected={new Date(`${dateField.value}T00:00:00`)}
          onSelect={(date: Date) => setValue(field, calendarDayKey(date), { shouldValidate: true })}
        />
      </SheetContentPortal>
    </>
  )
}

/** The inline note input: a leading icon and a borderless sheet input. */
export function PlansNoteFieldRow({ testID }: { testID: string }) {
  const { control } = useFormContext<PlansRowValues>()
  const { field } = useController({ name: 'note', control })

  return (
    <BottomSheetInput
      testID={testID}
      leadingIcon="create-outline"
      className="border-0 bg-transparent px-0 py-3.5"
      placeholder="Заметка"
      value={field.value}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
    />
  )
}
