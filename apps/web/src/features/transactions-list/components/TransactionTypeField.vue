<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Field as VeeField } from 'vee-validate'
import { getTransactionsOptions } from '@/entities/transaction/constants'
import { useI18n } from 'vue-i18n'

const transactionOptions = getTransactionsOptions()
const { t } = useI18n()
</script>

<template>
  <VeeField v-slot="{ field, errors }" name="type">
    <Field class="w-full md:w-auto" orientation="responsive" :data-invalid="!!errors.length">
      <FieldLabel for="type">{{ t('transactions.filters.typeLabel') }}</FieldLabel>
      <Select :name="field.name" :model-value="field.value" @update:model-value="field.onChange">
        <SelectTrigger
          id="type"
          :aria-invalid="!!errors.length"
          class="w-full! min-w-0 md:min-w-36"
        >
          <SelectValue :placeholder="t('transactions.filters.typePlaceholder')" />
        </SelectTrigger>
        <SelectContent position="item-aligned">
          <SelectItem v-for="item in transactionOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <FieldError v-if="errors.length" :errors="errors" />
    </Field>
  </VeeField>
</template>
