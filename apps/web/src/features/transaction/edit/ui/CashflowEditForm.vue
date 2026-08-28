<script setup lang="ts">
import { useForm, useFieldValue, Field as VeeField } from 'vee-validate'
import type { CashflowTransaction } from '@/entities/transaction'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@/shared/ui/button'
import { DialogClose, DialogFooter } from '@/shared/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { useI18n } from 'vue-i18n'
import { AmountField } from '@/shared/ui/amount-field'
import { AccountSelect, useAccounts } from '@/entities/account'
import { CategorySelect } from '@/entities/category'
import { useUpdateTransaction } from '@/entities/transaction'
import { notification } from '@/shared/services/notification'
import {
  createCashflowEditSchema,
  type CashflowEditValues,
} from '../model/cashflow-schema'
import { DEFAULT_CURRENCY, toMajorUnits, toMinorUnits, type CurrencyCode } from '@/shared/lib/money'
import { computed } from 'vue'

const emit = defineEmits<{
  success: []
}>()

const { id, version, type, amount, description, accountId, categoryId, cancellable = false } =
  defineProps<{
    id: string
    version: number
    type: 'expense' | 'income'
    amount: number
    description: string
    accountId: string
    categoryId: string
    /** Dialog mode: full-bleed footer with a context-closing cancel button. */
    cancellable?: boolean
  }>()

const { mutateAsync: updateTransaction } = useUpdateTransaction<CashflowTransaction>()
const { t } = useI18n()
const { data: accounts } = useAccounts()

const { handleSubmit: handleFormSubmit, isSubmitting } = useForm<CashflowEditValues>({
  validationSchema: toTypedSchema(createCashflowEditSchema()),
  initialValues: {
    type,
    amount: toMajorUnits(amount),
    description,
    accountId,
    categoryId,
  },
})

const accountIdValue = useFieldValue<CashflowEditValues['accountId']>('accountId')
const accountCurrency = computed<CurrencyCode>(() => {
  const account = accounts.value?.find((a) => a.id === accountIdValue.value)
  return account?.currency ?? DEFAULT_CURRENCY
})

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    await updateTransaction({
      id,
      payload: {
        version,
        type: data.type,
        accountId: data.accountId,
        amount: toMinorUnits(data.amount),
        description: data.description,
        categoryId: data.categoryId,
      },
    })
    notification.success(t('editTransaction.success'))
    emit('success')
  } catch (error) {
    notification.mutationError(error, {
      title: t('editTransaction.error'),
      feature: 'transaction',
      action: 'update',
    })
  }
})
</script>

<template>
  <div>
    <form id="edit-transaction-form" class="flex flex-col gap-3" @submit="handleSubmit">
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

    <DialogFooter
      v-if="cancellable"
      class="-mx-6 -mb-6 mt-1 flex-col gap-3 border-t px-6 py-4 sm:flex-row"
    >
      <DialogClose as-child>
        <Button type="button" variant="outline" class="w-full sm:flex-1">
          {{ t('editTransaction.cancel') }}
        </Button>
      </DialogClose>
      <Button
        form="edit-transaction-form"
        type="submit"
        class="w-full sm:flex-1"
        :loading="isSubmitting"
      >
        {{ t('editTransaction.submit') }}
      </Button>
    </DialogFooter>
    <div v-else class="flex justify-end pt-1">
      <Button
        form="edit-transaction-form"
        type="submit"
        class="w-full sm:w-auto"
        :loading="isSubmitting"
      >
        {{ t('editTransaction.submit') }}
      </Button>
    </div>
  </form>
  </div>
</template>
