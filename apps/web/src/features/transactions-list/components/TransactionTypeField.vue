<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { getTransactionsOptions } from '@/entities/transaction/constants'
import { useI18n } from 'vue-i18n'

defineProps<{
  modelValue?: 'expense' | 'income' | 'transfer'
  errors?: string[]
  class?: string
}>()

defineEmits<{
  'update:modelValue': [value: 'expense' | 'income' | 'transfer']
}>()

const transactionOptions = getTransactionsOptions()
const { t } = useI18n()
</script>

<template>
  <Field class="w-full md:w-auto" orientation="responsive" :data-invalid="!!$props.errors?.length">
    <FieldLabel for="type">{{ t('transactions.filters.typeLabel') }}</FieldLabel>
    <Select
      :model-value="$props.modelValue"
      @update:model-value="(v) => $emit('update:modelValue', v as 'expense' | 'income' | 'transfer')"
    >
      <SelectTrigger
        id="type"
        :aria-invalid="!!$props.errors?.length"
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
    <FieldError v-if="$props.errors?.length" :errors="$props.errors" />
  </Field>
</template>
