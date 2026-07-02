<script setup lang="ts">
import { useForm } from 'vee-validate'
import {
  createAddTransferSchema,
  type AddTransferFormValues,
} from './validation/add-transfer-schema'
import type { TransferTransaction } from '@/entities/transaction/types'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Field as VeeField } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import AmountField from '@/features/add-transaction/components/AmountField.vue'
import FromAccountField from './components/FromAccountField.vue'
import ToAccountField from './components/ToAccountField.vue'
import { nowIsoString } from '@/shared/lib/date'
import { useCreateTransaction } from '@/entities/transaction/use-transactions'

const emit = defineEmits<{
  success: []
}>()

const { lastCreatedTransaction = undefined } = defineProps<{
  lastCreatedTransaction?: TransferTransaction
}>()

const { mutateAsync: createTransaction } = useCreateTransaction<TransferTransaction>()
const { t } = useI18n()

const { handleSubmit: handleFormSubmit, isSubmitting } = useForm<AddTransferFormValues>({
  validationSchema: toTypedSchema(createAddTransferSchema()),
  initialValues: {
    type: 'transfer',
    fromAccountId: lastCreatedTransaction?.fromAccountId ?? '',
    toAccountId: lastCreatedTransaction?.toAccountId ?? '',
  },
})

const handleSubmit = handleFormSubmit(async (data) => {
  await createTransaction({
    type: data.type,
    fromAccountId: data.fromAccountId,
    toAccountId: data.toAccountId,
    amount: data.amount,
    description: data.description,
    occurredAt: nowIsoString(),
  })
  emit('success')
})
</script>

<template>
  <form id="add-transfer-form" class="flex flex-col gap-3" @submit="handleSubmit">
    <div class="space-y-1">
      <FieldLabel for="from-account-id">{{ t('addTransfer.fromAccountLabel') }}</FieldLabel>
      <div class="flex gap-2">
        <FromAccountField class="w-full" />
        <AmountField class="min-w-0 w-auto!" :placeholder="t('addTransfer.amountPlaceholder')" />
      </div>
    </div>

    <ToAccountField class="w-full" />

    <VeeField v-slot="{ field, errors }" name="description">
      <Field class="w-full md:min-w-56 md:flex-1" :data-invalid="!!errors.length">
        <FieldLabel for="transfer-description">{{ t('addTransfer.descriptionLabel') }}</FieldLabel>
        <Input
          id="transfer-description"
          :placeholder="t('addTransfer.descriptionPlaceholder')"
          v-bind="field"
          :aria-invalid="!!errors.length"
        />
        <FieldError v-if="errors.length" :errors="errors" />
      </Field>
    </VeeField>

    <Button
      form="add-transfer-form"
      type="submit"
      class="w-full md:ml-auto md:w-auto"
      :loading="isSubmitting"
    >
      {{ t('addTransfer.submit') }}
    </Button>
  </form>
</template>
