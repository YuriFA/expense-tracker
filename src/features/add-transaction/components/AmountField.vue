<script setup lang="ts">
import { useSettingsStore } from '@/stores/use-settings-store'
import { useI18n } from 'vue-i18n'
import { useField, Field as VeeField } from 'vee-validate'
import { Field, FieldError } from '@/components/ui/field'
import { NumberField, NumberFieldContent, NumberFieldInput } from '@/components/ui/number-field'
import type { AddTransactionFormValues } from '../validation/add-transaction-schema'

const props = withDefaults(
  defineProps<{
  class?: string
    placeholderKey?: string
  }>(),
  {
    placeholderKey: 'addTransaction.amountPlaceholder',
  },
)

const { t, locale } = useI18n()
const settings = useSettingsStore()
const { setValue } = useField<AddTransactionFormValues['amount']>('amount')
</script>

<template>
  <VeeField v-slot="{ field, errors }" name="amount">
    <Field :class="$props.class" :data-invalid="!!errors.length">
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
          <NumberFieldInput
            class="text-left px-2"
            :placeholder="t(props.placeholderKey)"
            :aria-invalid="!!errors.length"
          />
        </NumberFieldContent>
      </NumberField>
      <FieldError v-if="errors.length" :errors="errors" />
    </Field>
  </VeeField>
</template>
