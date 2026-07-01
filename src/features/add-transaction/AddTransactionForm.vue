<script setup lang="ts">
import { useForm } from 'vee-validate'
import {
  createAddTransactionSchema,
  type AddTransactionFormValues,
} from './validation/add-transaction-schema'
import type { CashflowTransaction } from '@/entities/transaction/types'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Field as VeeField } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import AmountField from './components/AmountField.vue'
import CategoriesField from './components/CategoriesField.vue'
import AccountField from './components/AccountField.vue'
import { nowIsoString } from '@/shared/lib/date'
import { useCreateTransaction } from '@/stores/use-transactions'

const emit = defineEmits<{
  success: []
}>()

const { type, lastCreatedTransaction = undefined } = defineProps<{
  type: 'expense' | 'income'
  lastCreatedTransaction?: CashflowTransaction
}>()

const { mutateAsync: createTransaction } = useCreateTransaction<CashflowTransaction>()
const { t } = useI18n()

const { handleSubmit: handleFormSubmit, isSubmitting } = useForm<AddTransactionFormValues>({
  validationSchema: toTypedSchema(createAddTransactionSchema()),
  initialValues: {
    type,
    accountId: lastCreatedTransaction?.accountId ?? '',
  },
})

const handleSubmit = handleFormSubmit(async (data) => {
  await createTransaction({
    type: data.type,
    accountId: data.accountId,
    amount: data.amount,
    description: data.description,
    categoryId: data.category,
    occurredAt: nowIsoString(),
  })
  emit('success')
})
</script>

<template>
  <form id="add-transaction-form" class="flex flex-col gap-3" @submit="handleSubmit">
    <div class="space-y-1">
      <FieldLabel for="account-id">{{ t('addTransaction.accountLabel') }}</FieldLabel>
      <div class="flex gap-2">
        <AccountField class="w-full" />
        <AmountField class="min-w-0 w-auto" />
      </div>
    </div>

    <VeeField v-slot="{ field, errors }" name="description">
      <Field class="w-full md:min-w-56 md:flex-1" :data-invalid="!!errors.length">
        <FieldLabel for="description">{{ t('addTransaction.descriptionLabel') }}</FieldLabel>
        <Input
          id="description"
          :placeholder="t('addTransaction.descriptionPlaceholder')"
          v-bind="field"
          :aria-invalid="!!errors.length"
        />
        <FieldError v-if="errors.length" :errors="errors" />
      </Field>
    </VeeField>

    <CategoriesField />

    <Button
      form="add-transaction-form"
      type="submit"
      class="w-full md:ml-auto md:w-auto"
      :loading="isSubmitting"
    >
      {{ t('addTransaction.submit') }}
    </Button>
  </form>
</template>
