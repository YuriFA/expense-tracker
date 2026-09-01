<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { getTransactionTypeOptions } from '@/entities/transaction'
import { useI18n } from 'vue-i18n'

defineProps<{
  errors?: string[]
  class?: string
}>()

const modelValue = defineModel<'expense' | 'income' | 'transfer' | 'adjustment' | undefined>()

const transactionOptions = getTransactionTypeOptions()
const { t } = useI18n()
</script>

<template>
  <Field class="w-full md:w-auto" orientation="responsive" :data-invalid="!!$props.errors?.length">
    <FieldLabel for="type">{{ t('transactions.filters.typeLabel') }}</FieldLabel>
    <Select v-model="modelValue">
      <SelectTrigger
        id="type"
        :aria-invalid="!!$props.errors?.length"
        class="w-full! min-w-0 md:min-w-36"
      >
        <SelectValue :placeholder="t('transactions.filters.typePlaceholder')" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="item in transactionOptions" :key="item.value" :value="item.value">
          {{ item.label }}
        </SelectItem>
      </SelectContent>
    </Select>
    <FieldError v-if="$props.errors?.length" :errors="$props.errors" />
  </Field>
</template>
