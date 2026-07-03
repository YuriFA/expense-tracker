<script setup lang="ts">
import { useSettingsStore } from '@/app/use-settings-store'
import { useI18n } from 'vue-i18n'
import { useField, Field as VeeField } from 'vee-validate'
import { Field, FieldError } from '@/shared/ui/field'
import { NumberField, NumberFieldContent, NumberFieldInput } from '@/shared/ui/number-field'
import type { AddTransactionFormValues } from '../validation/add-transaction-schema'
import { formatCurrency } from '@/shared/lib/money/format'
import { computed } from 'vue'

const props = defineProps<{
  class?: string
}>()

const { locale } = useI18n()
const settings = useSettingsStore()
const { setValue } = useField<AddTransactionFormValues['amount']>('amount')
const placeholder = computed(() => formatCurrency(100, settings.currency, locale.value))
</script>

<template>
  <VeeField v-slot="{ field, errors }" name="amount">
    <Field :class="props.class" :data-invalid="!!errors.length">
      <NumberField
        id="amount"
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
        :model-value="field.value"
        @update:model-value="
          (value) => {
            if (value) {
              setValue(value)
            } else {
              setValue(undefined as unknown as number)
            }
          }
        "
      >
        <NumberFieldContent>
          <NumberFieldInput class="text-left px-2" :placeholder :aria-invalid="!!errors.length" />
        </NumberFieldContent>
      </NumberField>
      <FieldError v-if="errors.length" :errors="errors" />
    </Field>
  </VeeField>
</template>
