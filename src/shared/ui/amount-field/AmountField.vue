<script setup lang="ts">
import { useSettingsStore } from '@/shared/store/use-settings-store'
import { useI18n } from 'vue-i18n'
import { Field, FieldError } from '@/shared/ui/field'
import { NumberField, NumberFieldContent, NumberFieldInput } from '@/shared/ui/number-field'
import { formatCurrency } from '@/shared/lib/money'
import { computed } from 'vue'

const props = defineProps<{
  errors?: string[]
  placeholder?: string
  class?: string
}>()

const modelValue = defineModel<number | undefined>()

const { locale } = useI18n()
const settings = useSettingsStore()
const defaultPlaceholder = computed(() => formatCurrency(100, settings.currency, locale.value))
const placeholder = computed(() => props.placeholder ?? defaultPlaceholder.value)
</script>

<template>
  <Field :class="props.class" :data-invalid="!!props.errors?.length">
    <NumberField
      id="amount"
      v-model="modelValue"
      :locale
      :format-options="{
        style: 'currency',
        currency: settings.currency,
        currencyDisplay: 'symbol',
        currencySign: 'accounting',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }"
      :min="0"
      :step="0.01"
    >
      <NumberFieldContent>
        <NumberFieldInput class="text-left px-2" :placeholder :aria-invalid="!!props.errors?.length" />
      </NumberFieldContent>
    </NumberField>
    <FieldError v-if="props.errors?.length" :errors="props.errors" />
  </Field>
</template>
