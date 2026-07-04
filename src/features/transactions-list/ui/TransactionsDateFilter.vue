<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { Button } from '@/shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { RangeCalendar } from '@/shared/ui/range-calendar'
import { CalendarIcon } from '@lucide/vue'
import { computed, ref, shallowRef } from 'vue'
import { useTransactionsFilters } from '../model/use-transactions-filters'
import {
  addCalendarDays,
  currentDay,
  formatCalendarDay,
  formatCalendarRange,
  fromDateValue,
  startOfMonth,
  toDateValue,
  type CalendarDay,
} from '@/shared/lib/date'
import { useI18n } from 'vue-i18n'

type DraftRange = {
  start: CalendarDay | undefined
  end: CalendarDay | undefined
}

type CalendarRangeValue = {
  start: DateValue | undefined
  end: DateValue | undefined
}

const { locale, t } = useI18n()
const { filters, setFilters } = useTransactionsFilters()

const open = ref(false)
const draftRange = shallowRef<DraftRange>({
  start: filters.value.fromDate,
  end: filters.value.toDate,
})

const calendarRange = computed<CalendarRangeValue>(() => ({
  start: draftRange.value.start ? toDateValue(draftRange.value.start) : undefined,
  end: draftRange.value.end ? toDateValue(draftRange.value.end) : undefined,
}))

const syncDraftRange = () => {
  draftRange.value = {
    start: filters.value.fromDate,
    end: filters.value.toDate,
  }
}

const presetRanges = computed(() => {
  const now = currentDay()

  return [
    {
      label: t('transactions.dateFilter.allTime'),
      range: { start: undefined, end: undefined },
    },
    { label: t('transactions.dateFilter.today'), range: { start: now, end: now } },
    {
      label: t('transactions.dateFilter.last30Days'),
      range: { start: addCalendarDays(now, -29), end: now },
    },
    {
      label: t('transactions.dateFilter.thisMonth'),
      range: { start: startOfMonth(now), end: now },
    },
  ]
})

const dateFormatted = computed(() => {
  if (!filters.value.fromDate || !filters.value.toDate) {
    return t('transactions.dateFilter.allTime')
  }

  return filters.value.fromDate === filters.value.toDate
    ? formatCalendarDay(filters.value.fromDate, locale.value, { dateStyle: 'medium' })
    : formatCalendarRange(filters.value.fromDate, filters.value.toDate, locale.value, {
        dateStyle: 'medium',
      })
})

const isApplyDisabled = computed(() => {
  if (!draftRange.value.start && !draftRange.value.end) {
    return false
  }

  return !draftRange.value.start || !draftRange.value.end
})

const handleOpenChange = (value: boolean) => {
  open.value = value

  if (value) {
    syncDraftRange()
  }
}

const setDraftRange = (range: DraftRange) => {
  draftRange.value = {
    start: range.start,
    end: range.end,
  }
}

const handleRangeChange = (range: CalendarRangeValue) => {
  setDraftRange({
    start: range.start ? fromDateValue(range.start) : undefined,
    end: range.end ? fromDateValue(range.end) : undefined,
  })
}

const applyRange = async () => {
  if (!draftRange.value.start || !draftRange.value.end) {
    await setFilters({ fromDate: undefined, toDate: undefined })
    open.value = false
    return
  }

  await setFilters({ fromDate: draftRange.value.start, toDate: draftRange.value.end })

  open.value = false
}
</script>

<template>
  <Popover :open="open" @update:open="handleOpenChange">
    <PopoverTrigger as-child>
      <Button variant="outline"><CalendarIcon /> {{ dateFormatted }}</Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-auto p-0">
      <div class="flex flex-col gap-4 p-4">
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="preset in presetRanges"
            :key="preset.label"
            variant="outline"
            size="sm"
            :class="{
              'bg-muted border-primary':
                draftRange.start === preset.range.start && draftRange.end === preset.range.end,
            }"
            @click="setDraftRange(preset.range)"
          >
            {{ preset.label }}
          </Button>
        </div>

        <div class="border-t" />

        <RangeCalendar
          :model-value="calendarRange"
          :placeholder="toDateValue(draftRange.start ?? filters.fromDate ?? currentDay())"
          :locale="locale"
          :number-of-months="2"
          initial-focus
          @update:model-value="handleRangeChange"
        />

        <div class="flex items-center justify-end gap-2 border-t pt-4">
          <Button variant="ghost" @click="open = false">
            {{ t('transactions.dateFilter.cancel') }}
          </Button>
          <Button :disabled="isApplyDisabled" @click="applyRange">
            {{ t('transactions.dateFilter.apply') }}
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
