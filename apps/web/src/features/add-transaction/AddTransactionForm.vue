<script setup lang="ts">
import { useForm } from 'vee-validate'
import {
  createAddTransactionSchema,
  type AddTransactionFormValues,
} from './validation/add-transaction-schema'
import type { CashflowTransaction } from '@/entities/transaction'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@/shared/ui/button'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Field as VeeField } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import { AmountField } from '@/shared/ui/amount-field'
import CategoriesField from './components/CategoriesField.vue'
import AccountField from './components/AccountField.vue'
import { nowIsoString } from '@/shared/lib/date'
import { useCreateTransaction } from '@/entities/transaction'
import { notification } from '@/shared/services/notification'

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
  try {
    await createTransaction({
      type: data.type,
      accountId: data.accountId,
      amount: data.amount,
      description: data.description,
      categoryId: data.category,
      occurredAt: nowIsoString(),
    })
    notification.success(t('addTransaction.success'))
    emit('success')
  } catch (error) {
    notification.mutationError(error, {
      title: t('addTransaction.error'),
      feature: 'transaction',
      action: 'create',
    })
  }
})
</script>

<template>
  <form id="add-transaction-form" class="flex flex-col gap-3" @submit="handleSubmit">
    <div class="space-y-1">
      <FieldLabel for="account-id">{{ t('addTransaction.accountLabel') }}</FieldLabel>
      <div class="flex gap-2">
        <VeeField v-slot="{ value, setValue, errors }" name="accountId">
          <AccountField
            class="w-full"
            :model-value="value"
            :errors="errors"
            @update:model-value="setValue"
          />
        </VeeField>
        <VeeField v-slot="{ value, setValue, errors }" name="amount">
          <AmountField
            class="min-w-0 w-auto"
            :model-value="value"
            :errors="errors"
            @update:model-value="(v) => setValue(v as number)"
          />
        </VeeField>
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

    <VeeField v-slot="{ value, setValue, errors }" name="category">
      <CategoriesField
        :model-value="value"
        :errors="errors"
        :type="type"
        @update:model-value="setValue"
      />
    </VeeField>

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
