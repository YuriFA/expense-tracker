<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm, useFieldValue, Field as VeeField } from 'vee-validate'
import { Button } from '@/shared/ui/button'
import { useI18n } from 'vue-i18n'
import {
  createTransactionsFilterSchema,
  type TransactionsFilterFormValues,
} from '../model/transactions-filter-schema'
import { useTransactionsFilters } from '../model/use-transactions-filters'
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
    type: filters.value.type,
    accountId: filters.value.accountIds,
    categoryId: filters.value.categoryIds,
  },
})

const typeFieldValue = useFieldValue<TransactionsFilterFormValues['type']>('type')

const handleSubmit = handleFormSubmit(async (data) => {
  await setFilters({
    type: data.type,
    accountIds: data.accountId,
    categoryIds: data.categoryId,
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
  <!-- Drawer specimen: the fields scroll, the reset/apply pair stays pinned
       to the sheet footer. -->
  <form id="transactions-filter-form" class="flex min-h-0 flex-1 flex-col" @submit="handleSubmit">
    <div class="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 py-6">
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
    </div>

    <div class="flex gap-3 border-t border-border px-6 py-5">
      <Button type="button" variant="secondary" class="flex-1" @click="handleReset">
        {{ t('transactions.reset') }}
      </Button>
      <Button type="submit" class="flex-1">
        {{ t('transactions.apply') }}
      </Button>
    </div>
  </form>
</template>
