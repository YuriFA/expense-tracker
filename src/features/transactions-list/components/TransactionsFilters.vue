<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm, useFieldValue, Field as VeeField } from 'vee-validate'
import { Button } from '@/shared/ui/button'
import { useI18n } from 'vue-i18n'
import {
  createTransactionsFilterSchema,
  type TransactionsFilterFormValues,
} from '../validation/transactions-filter-schema'
import { useTransactionsFilters } from '../composables/use-transactions-filters'
import TransactionTypeField from './TransactionTypeField.vue'
import TransactionCategoriesField from './TransactionCategoriesField.vue'
import TransactionAccountField from './TransactionAccountField.vue'

const emit = defineEmits<{
  (e: 'submit'): void
}>()

const { t } = useI18n()

const { filters, setFilters, resetFilters } = useTransactionsFilters()

const { handleSubmit: handleFormSubmit, resetForm } = useForm<TransactionsFilterFormValues>({
  validationSchema: toTypedSchema(createTransactionsFilterSchema()),
  initialValues: {
    accountId: filters.value.accountId,
    categoryId: filters.value.categoryId,
    type: filters.value.type,
  },
})

const typeFieldValue = useFieldValue<TransactionsFilterFormValues['type']>('type')

const handleSubmit = handleFormSubmit(async (data) => {
  await setFilters({
    type: data.type,
    accountId: data.accountId,
    categoryId: data.categoryId,
  })

  emit('submit')
})

const handleReset = async () => {
  await resetFilters()
  resetForm({
    values: {
      accountId: undefined,
      categoryId: undefined,
      type: undefined,
    },
  })
}
</script>

<template>
  <form id="transactions-filter-form" class="flex flex-col gap-3" @submit="handleSubmit">
    <VeeField v-slot="{ value, setValue, errors }" name="type">
      <TransactionTypeField
        :model-value="value"
        :errors="errors"
        @update:model-value="setValue"
      />
    </VeeField>

    <VeeField v-slot="{ value, setValue, errors }" name="accountId">
      <TransactionAccountField
        :model-value="value"
        :errors="errors"
        @update:model-value="setValue"
      />
    </VeeField>

    <VeeField v-slot="{ value, setValue, errors }" name="categoryId">
      <TransactionCategoriesField
        :model-value="value"
        :errors="errors"
        :type="typeFieldValue"
        @update:model-value="setValue"
      />
    </VeeField>

    <div class="flex flex-col gap-2 md:flex-row md:justify-end">
      <Button type="button" variant="outline" class="w-full md:w-auto" @click="handleReset">
        {{ t('transactions.reset') }}
      </Button>
      <Button type="submit" class="w-full md:w-auto">
        {{ t('transactions.apply') }}
      </Button>
    </div>
  </form>
</template>
