<script setup lang="ts">
import { useForm, useFieldValue, Field as VeeField } from 'vee-validate'
import {
  createAddTransferSchema,
  type AddTransferFormValues,
} from '../model/add-transfer-schema'
import type { TransferTransaction } from '@/entities/transaction'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@/shared/ui/button'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { useI18n } from 'vue-i18n'
import { AmountField } from '@/shared/ui/amount-field'
import FromAccountField from './FromAccountField.vue'
import ToAccountField from './ToAccountField.vue'
import { nowIsoString } from '@/shared/lib/date'
import { useCreateTransaction } from '@/entities/transaction'
import { notification } from '@/shared/services/notification'

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

const fromAccountId = useFieldValue<AddTransferFormValues['fromAccountId']>('fromAccountId')
const toAccountId = useFieldValue<AddTransferFormValues['toAccountId']>('toAccountId')

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    await createTransaction({
      type: data.type,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      amount: data.amount,
      description: data.description,
      occurredAt: nowIsoString(),
    })
    notification.success(t('addTransfer.success'))
    emit('success')
  } catch (error) {
    notification.mutationError(error, {
      title: t('addTransfer.error'),
      feature: 'transaction',
      action: 'create',
    })
  }
})
</script>

<template>
  <form id="add-transfer-form" class="flex flex-col gap-3" @submit="handleSubmit">
    <div class="space-y-1">
      <FieldLabel for="from-account-id">{{ t('addTransfer.fromAccountLabel') }}</FieldLabel>
      <div class="flex gap-2">
        <VeeField v-slot="{ value, setValue, errors }" name="fromAccountId">
          <FromAccountField
            class="w-full"
            :model-value="value"
            :errors="errors"
            :exclude-id="toAccountId"
            @update:model-value="setValue"
          />
        </VeeField>
        <VeeField v-slot="{ value, setValue, errors }" name="amount">
          <AmountField
            class="min-w-0 w-auto!"
            :model-value="value"
            :errors="errors"
            :placeholder="t('addTransfer.amountPlaceholder')"
            @update:model-value="(v) => setValue(v as number)"
          />
        </VeeField>
      </div>
    </div>

    <VeeField v-slot="{ value, setValue, errors }" name="toAccountId">
      <ToAccountField
        class="w-full"
        :model-value="value"
        :errors="errors"
        :exclude-id="fromAccountId"
        @update:model-value="setValue"
      />
    </VeeField>

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
