<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { useCategories } from '@/entities/category/use-categories'
import { useFieldValue, Field as VeeField } from 'vee-validate'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TransactionsFilterFormValues } from '../validation/transactions-filter-schema'

const { t } = useI18n()

const typeField = useFieldValue<TransactionsFilterFormValues['type']>('type')
const { data: categories } = useCategories()

const fiteredCategories = computed(() => {
  if (typeField.value === undefined) {
    return categories.value
  }

  return categories.value?.filter((category) => category.type === typeField.value)
})
</script>

<template>
  <VeeField v-slot="{ field, errors }" name="categoryId">
    <Field class="w-full md:w-auto" orientation="responsive" :data-invalid="!!errors.length">
      <FieldLabel for="category-id">{{ t('transactions.filters.categoryLabel') }}</FieldLabel>
      <Select :name="field.name" :model-value="field.value" @update:model-value="field.onChange">
        <SelectTrigger
          id="category-id"
          :aria-invalid="!!errors.length"
          class="w-full! min-w-0 md:min-w-36"
        >
          <SelectValue :placeholder="t('transactions.filters.categoryPlaceholder')" />
        </SelectTrigger>
        <SelectContent position="item-aligned">
          <SelectItem v-for="category in fiteredCategories" :key="category.id" :value="category.id">
            {{ category.icon }} {{ category.name }}
          </SelectItem>
        </SelectContent>
      </Select>
      <FieldError v-if="errors.length" :errors="errors" />
    </Field>
  </VeeField>
</template>
