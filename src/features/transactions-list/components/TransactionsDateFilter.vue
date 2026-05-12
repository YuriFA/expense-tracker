<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { CalendarIcon } from 'lucide-vue-next'
import { computed, ref, shallowRef } from 'vue'
import { useTransactionsFilters } from '../composables/use-transactions-filters'
import { currentDay, startOfMonth, type DateValue } from '@/shared/lib/date'
import { DateFormatter, getLocalTimeZone } from '@internationalized/date'
import { useI18n } from 'vue-i18n'

type DraftRange = {
  start: DateValue | undefined
  end: DateValue | undefined
}

const { locale, t } = useI18n()
const { fromDate, toDate, setRange } = useTransactionsFilters()

const open = ref(false)
const draftRange = shallowRef<DraftRange>({
  start: fromDate.value,
  end: toDate.value,
})

const syncDraftRange = () => {
  draftRange.value = {
    start: fromDate.value,
    end: toDate.value,
  }
}

const presetRanges = computed(() => {
  const now = currentDay()

  return [
    { label: t('transactions.dateFilter.today'), range: { start: now, end: now } },
    {
      label: t('transactions.dateFilter.last7Days'),
      range: { start: now.subtract({ days: 6 }), end: now },
    },
    {
      label: t('transactions.dateFilter.last30Days'),
      range: { start: now.subtract({ days: 29 }), end: now },
    },
    {
      label: t('transactions.dateFilter.thisMonth'),
      range: { start: startOfMonth(now), end: now },
    },
  ]
})

const dateFormatted = computed(() => {
  const formatter = new DateFormatter(locale.value, { dateStyle: 'medium' })
  const from = fromDate.value.toDate(getLocalTimeZone())
  const to = toDate.value.toDate(getLocalTimeZone())
  return fromDate.value.compare(toDate.value) === 0
    ? formatter.format(from)
    : formatter.formatRange(from, to)
})

const isApplyDisabled = computed(() => !draftRange.value.start || !draftRange.value.end)

const onOpenChange = (value: boolean) => {
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

const applyRange = () => {
  if (!draftRange.value.start || !draftRange.value.end) {
    return
  }

  setRange(draftRange.value.start, draftRange.value.end)
  open.value = false
}
</script>

<template>
  <Popover :open="open" @update:open="onOpenChange">
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
            @click="setDraftRange(preset.range)"
          >
            {{ preset.label }}
          </Button>
        </div>

        <div class="border-t" />

        <RangeCalendar
          :model-value="draftRange"
          :placeholder="draftRange.start ?? fromDate"
          :locale="locale"
          :number-of-months="2"
          initial-focus
          @update:model-value="setDraftRange"
        />

        <div class="flex items-center justify-end gap-2 border-t pt-4">
          <Button variant="ghost" @click="open = false">{{
            t('transactions.dateFilter.cancel')
          }}</Button>
          <Button :disabled="isApplyDisabled" @click="applyRange">
            {{ t('transactions.dateFilter.apply') }}
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
