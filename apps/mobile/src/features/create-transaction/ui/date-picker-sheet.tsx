import { useState } from 'react'
import { View } from 'react-native'
import { Icon } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import { Pressable } from '@/shared/ui/pressable'
import { cn } from '@/shared/lib/utils'
import { MONTH_FULL } from '@/shared/lib/format/format'
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  BottomSheetView,
} from '@/shared/ui/bottom-sheet'

const WEEKDAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'] as const

/** Day cells for a month view: null placeholders keep Mondays aligned. */
function monthCells(year: number, month: number): (number | null)[] {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
}

function weeksOf(cells: (number | null)[]): (number | null)[][] {
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * Month-grid calendar sheet for the "Другой" quick-date action. Picking a day
 * reports it up and dismisses the sheet; the chosen day keeps the current
 * time of day.
 */
export function DatePickerSheet({
  ref,
  selected,
  onSelect,
}: {
  ref: React.Ref<BottomSheetRef>
  selected: Date
  onSelect: (date: Date) => void
}) {
  const [view, setView] = useState(() => ({
    year: selected.getFullYear(),
    month: selected.getMonth(),
  }))
  const now = new Date()
  const isViewingSelectedMonth =
    view.year === selected.getFullYear() && view.month === selected.getMonth()

  const shiftMonth = (delta: 1 | -1) =>
    setView((current) =>
      current.month === 0 && delta === -1
        ? { year: current.year - 1, month: 11 }
        : current.month === 11 && delta === 1
          ? { year: current.year + 1, month: 0 }
          : { ...current, month: current.month + delta },
    )

  const handleDayPress = (day: number) => {
    onSelect(
      new Date(view.year, view.month, day, now.getHours(), now.getMinutes(), now.getSeconds()),
    )
    if (ref && typeof ref !== 'function') ref.current?.dismiss()
  }

  return (
    <BottomSheet
      ref={ref}
      snapPoints={['60%']}
      testID="new-transaction-date-picker"
      stackBehavior="push"
    >
      <BottomSheetHeader title={`${MONTH_FULL[view.month]} ${view.year}`} />
      <BottomSheetView testID="new-transaction-calendar">
        <View className="gap-2 px-4 pb-6">
          <View className="flex-row items-center justify-between">
            <Pressable
              testID="new-transaction-calendar-prev"
              accessibilityRole="button"
              accessibilityLabel="Предыдущий месяц"
              className="h-10 w-10 items-center justify-center"
              onPress={() => shiftMonth(-1)}
            >
              <Icon name="chevron-back" size={20} colorClassName="accent-muted-foreground" />
            </Pressable>
            <Text variant="label" className="text-muted-foreground">
              {WEEKDAYS.join(' ')}
            </Text>
            <Pressable
              testID="new-transaction-calendar-next"
              accessibilityRole="button"
              accessibilityLabel="Следующий месяц"
              className="h-10 w-10 items-center justify-center"
              onPress={() => shiftMonth(1)}
            >
              <Icon name="chevron-forward" size={20} colorClassName="accent-muted-foreground" />
            </Pressable>
          </View>

          {weeksOf(monthCells(view.year, view.month)).map((week, weekIndex) => (
            <View key={weekIndex} className="flex-row">
              {week.map((day, dayIndex) => {
                if (day === null) return <View key={dayIndex} className="h-11 flex-1" />
                const isSelected = isViewingSelectedMonth && day === selected.getDate()
                const isToday =
                  view.year === now.getFullYear() &&
                  view.month === now.getMonth() &&
                  day === now.getDate()
                const dateKey = `${view.year}-${pad(view.month + 1)}-${pad(day)}`
                return (
                  <Pressable
                    key={day}
                    testID={`new-transaction-calendar-day-${dateKey}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${day} ${MONTH_FULL[view.month]}`}
                    accessibilityState={{ selected: isSelected }}
                    className={cn(
                      'h-11 flex-1 items-center justify-center rounded-full',
                      isSelected && 'bg-primary',
                      !isSelected && isToday && 'border border-primary',
                    )}
                    onPress={() => handleDayPress(day)}
                  >
                    <Text
                      variant="body-sm"
                      className={isSelected ? 'text-primary-foreground' : 'text-foreground'}
                    >
                      {day}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ))}
        </View>
      </BottomSheetView>
    </BottomSheet>
  )
}
