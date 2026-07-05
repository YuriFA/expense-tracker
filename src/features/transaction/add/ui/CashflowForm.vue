<script setup lang="ts">
import { useForm, useFieldValue, Field as VeeField } from 'vee-validate'
import {
  createCashflowSchema,
  type CashflowFormValues,
} from '../model/cashflow-schema'
import { lastAccountIds } from '../model/last-account-ids'
import type { CashflowTransaction } from '@/entities/transaction'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@/shared/ui/button'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { useI18n } from 'vue-i18n'
import { AmountField } from '@/shared/ui/amount-field'
import { AccountSelect, useAccounts } from '@/entities/account'
import { CategorySelect } from '@/entities/category'
import { nowIsoString } from '@/shared/lib/date'
import { useCreateTransaction } from '@/entities/transaction'
import { notification } from '@/shared/services/notification'
import { DEFAULT_CURRENCY, toMinorUnits, type CurrencyCode } from '@/shared/lib/money'
import { computed } from 'vue'

const emit = defineEmits<{
  success: []
}>()

const { type } = defineProps<{
  type: 'expense' | 'income'
}>()

const { mutateAsync: createTransaction } = useCreateTransaction<CashflowTransaction>()
const { t } = useI18n()
const { data: accounts } = useAccounts()

const { handleSubmit: handleFormSubmit, isSubmitting } = useForm<CashflowFormValues>({
  validationSchema: toTypedSchema(createCashflowSchema()),
  initialValues: {
    type,
    accountId: lastAccountIds.getCashflowAccountId() ?? '',
  },
})

const accountIdValue = useFieldValue<CashflowFormValues['accountId']>('accountId')
const accountCurrency = computed<CurrencyCode>(() => {
  const account = accounts.value?.find((a) => a.id === accountIdValue.value)
  return account?.currency ?? DEFAULT_CURRENCY
})

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    await createTransaction({
      type: data.type,
      amount: toMinorUnits(data.amount),
      description: data.description,
      accountId: data.accountId,
      categoryId: data.categoryId,
      occurredAt: nowIsoString(),
    })
    lastAccountIds.setCashflowAccountId(data.accountId)
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
    <div class="flex items-end gap-2">
      <VeeField v-slot="{ value, setValue, errors }" name="accountId">
        <AccountSelect
          input-id="account-id"
          :label="t('addTransaction.accountLabel')"
          :placeholder="t('addTransaction.accountPlaceholder')"
          class="w-full"
          :model-value="value"
          :errors="errors"
          @update:model-value="setValue"
        />
      </VeeField>
      <VeeField v-slot="{ value, setValue, errors }" name="amount">
        <AmountField
          class="min-w-0 w-auto"
          :currency="accountCurrency"
          :model-value="value"
          :errors="errors"
          @update:model-value="(v) => setValue(v as number)"
        />
      </VeeField>
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

    <VeeField v-slot="{ value, setValue, errors }" name="categoryId">
      <CategorySelect
        input-id="category-id"
        :label="t('addTransaction.categoryLabel')"
        :placeholder="t('addTransaction.categoryPlaceholder')"
        :type="type"
        class="w-full md:w-auto"
        :model-value="value"
        :errors="errors"
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
