<script setup lang="ts">
import { ref } from 'vue'
import { DateField } from '@/shared/ui/date-field'
import { useI18n } from 'vue-i18n'
import { type CalendarDay } from '@/shared/lib/date'

const date = ref<CalendarDay>()
const { t } = useI18n()
</script>

<template>
  <DateField
    input-id="filter-custom-date"
    class="w-60 justify-start"
    :model-value="date"
    :placeholder="t('transactions.dateFilter.pickDate')"
    @update:model-value="(value) => (date = value)"
  />
</template>
