<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Field, FieldError } from '@/shared/ui/field'
import { NumberField, NumberFieldContent, NumberFieldInput } from '@/shared/ui/number-field'
import { formatMoney, DEFAULT_CURRENCY, type CurrencyCode } from '@/shared/lib/money'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    currency?: CurrencyCode
    errors?: string[]
    placeholder?: string
    class?: string
  }>(),
  {
    currency: DEFAULT_CURRENCY,
    errors: undefined,
    placeholder: undefined,
    class: undefined,
  },
)

const modelValue = defineModel<number | undefined>()

const { locale } = useI18n()
const defaultPlaceholder = computed(() =>
  formatMoney(10_000, props.currency, locale.value),
)
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
        currency: props.currency,
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
