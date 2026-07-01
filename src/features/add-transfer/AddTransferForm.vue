<script setup lang="ts">
import { useLastUsedAccountId } from '@/composables/use-last-used-account-id'
import { useForm } from 'vee-validate'
import { useTransactionsStore } from '@/stores/use-transactions-store'
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
import { useAccountsStore } from '@/stores/use-accounts-store'
import { nowIsoString } from '@/shared/lib/date'

const emit = defineEmits<{
  success: []
}>()

const transactions = useTransactionsStore()
const accounts = useAccountsStore()
const lastUsedAccountId = useLastUsedAccountId()
const { t } = useI18n()

const initialFromAccountId = lastUsedAccountId.value ?? ''
const initialToAccountId = accounts.items.find((item) => item.id !== initialFromAccountId)?.id ?? ''

const { handleSubmit: handleFormSubmit, isSubmitting } = useForm<AddTransferFormValues>({
  validationSchema: toTypedSchema(createAddTransferSchema()),
  initialValues: {
    type: 'transfer',
    fromAccountId: initialFromAccountId,
    toAccountId: initialToAccountId,
  },
})

const handleSubmit = handleFormSubmit(async (data) => {
  await transactions.addTransaction<TransferTransaction>({
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
