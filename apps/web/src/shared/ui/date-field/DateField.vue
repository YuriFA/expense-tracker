<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { HTMLAttributes } from 'vue'
import { CalendarIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDesktopPresentation } from '@/shared/lib/presentation'
import {
  addCalendarDays,
  currentDay,
  formatCalendarDay,
  fromDateValue,
  toDateValue,
  type CalendarDay,
} from '@/shared/lib/date'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Calendar } from '@/shared/ui/calendar'
import { Drawer, DrawerContent, DrawerHeader, DRAWER_SAFE_AREA_BOTTOM, DrawerTitle } from '@/shared/ui/drawer'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'

const props = defineProps<{
  inputId: string
  modelValue?: CalendarDay
  placeholder: string
  class?: HTMLAttributes['class']
  ariaInvalid?: boolean
  drawerTitle?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CalendarDay]
}>()

const { locale, t } = useI18n()
const isDesktop = useDesktopPresentation()
const open = ref(false)
const defaultPlaceholder = toDateValue(currentDay())

const selectedDateValue = computed(() => (props.modelValue ? toDateValue(props.modelValue) : undefined))
const label = computed(() => {
  if (!props.modelValue) {
    return props.placeholder
  }

  return formatCalendarDay(props.modelValue, locale.value, { dateStyle: 'long' })
})
const quickOptions = computed(() => {
  const today = currentDay()

  return [
    { label: t('common.yesterday'), value: addCalendarDays(today, -1) },
    { label: t('common.today'), value: today },
    { label: t('common.tomorrow'), value: addCalendarDays(today, 1) },
  ]
})

const handlePick = (value: CalendarDay) => {
  emit('update:modelValue', value)
  open.value = false
}
const handleCalendarPick = (value: DateValue | undefined) => {
  if (!value) {
    return
  }

  handlePick(fromDateValue(value))
}
</script>

<template>
  <Popover v-if="isDesktop" v-slot="{ close }">
    <PopoverTrigger as-child>
      <Button
        :id="props.inputId"
        type="button"
        variant="outline"
        :class="cn('w-full justify-between text-left font-normal', !props.modelValue && 'text-muted-foreground', props.class)"
        :aria-invalid="props.ariaInvalid"
      >
        <span>{{ label }}</span>
        <CalendarIcon class="text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        :model-value="selectedDateValue"
        :default-placeholder="defaultPlaceholder"
        layout="month-and-year"
        initial-focus
        @update:model-value="
          (value) => {
            handleCalendarPick(value)
            close()
          }
        "
      />
    </PopoverContent>
  </Popover>

  <Drawer v-else v-model:open="open">
    <Button
      :id="props.inputId"
      type="button"
      variant="outline"
      :class="cn('w-full justify-between text-left font-normal', !props.modelValue && 'text-muted-foreground', props.class)"
      :aria-invalid="props.ariaInvalid"
      @click="open = true"
    >
      <span>{{ label }}</span>
      <CalendarIcon class="text-muted-foreground" />
    </Button>

    <DrawerContent>
      <template #header>
        <DrawerHeader>
          <DrawerTitle>{{ props.drawerTitle ?? t('fields.date') }}</DrawerTitle>
        </DrawerHeader>
      </template>
      <div :class="cn('space-y-4 px-6', DRAWER_SAFE_AREA_BOTTOM)">
        <div class="grid grid-cols-3 gap-2">
          <Button
            v-for="option in quickOptions"
            :key="option.label"
            type="button"
            :variant="props.modelValue === option.value ? 'default' : 'outline'"
            class="min-w-0"
            @click="handlePick(option.value)"
          >
            {{ option.label }}
          </Button>
        </div>

        <Calendar
          :model-value="selectedDateValue"
          :default-placeholder="defaultPlaceholder"
          layout="month-and-year"
          initial-focus
          @update:model-value="handleCalendarPick"
        />
      </div>
    </DrawerContent>
  </Drawer>
</template>
