<script setup lang="ts">
import type { DateValue } from '@internationalized/date'

import { CalendarIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { computed, ref, type Ref } from 'vue'
import { cn } from '@/shared/lib/utils'
import { useI18n } from 'vue-i18n'
import { currentDay, formatCalendarDay, fromDateValue, toDateValue } from '@/shared/lib/date'

const defaultPlaceholder = toDateValue(currentDay())
const date = ref() as Ref<DateValue>
const { locale, t } = useI18n()

const dateFormatted = computed(() => {
  if (!date.value) {
    return t('transactions.dateFilter.pickDate')
  }

  return formatCalendarDay(fromDateValue(date.value), locale.value, {
    dateStyle: 'long',
  })
})
</script>

<template>
  <Popover v-slot="{ close }">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="cn('w-60 justify-start text-left font-normal', !date && 'text-muted-foreground')"
      >
        <CalendarIcon />
        {{ dateFormatted }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        v-model="date"
        :default-placeholder="defaultPlaceholder"
        layout="month-and-year"
        initial-focus
        @update:model-value="close"
      />
    </PopoverContent>
  </Popover>
</template>
