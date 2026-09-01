<script setup lang="ts">
import { computed } from 'vue'
import { useForm, useFieldValue, Field as VeeField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useI18n } from 'vue-i18n'
import { Button } from '@/shared/ui/button'
import { DialogClose, DialogFooter } from '@/shared/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { NumberField, NumberFieldContent, NumberFieldInput } from '@/shared/ui/number-field'
import { notification } from '@/shared/services/notification'
import { DEFAULT_CURRENCY, toMajorUnits, toMinorUnits, type CurrencyCode } from '@/shared/lib/money'
import { AccountSelect, useAccounts } from '@/entities/account'
import { useUpdateTransaction, type AdjustmentTransaction } from '@/entities/transaction'
import { createAdjustmentEditSchema, type AdjustmentEditValues } from '../model/adjustment-schema'

const emit = defineEmits<{
  success: []
}>()

const {
  id,
  version,
  amount,
  description,
  accountId: initialAccountId,
} = defineProps<{
  id: string
  version: number
  amount: number
  description: string
  accountId: string
}>()

const { t, locale } = useI18n()
const { mutateAsync: updateTransaction } = useUpdateTransaction<AdjustmentTransaction>()
const { data: accounts } = useAccounts()

const { handleSubmit: handleFormSubmit, isSubmitting } = useForm<AdjustmentEditValues>({
  validationSchema: toTypedSchema(createAdjustmentEditSchema()),
  initialValues: {
    type: 'adjustment',
    amount: toMajorUnits(amount),
    description,
    accountId: initialAccountId,
  },
})

const accountId = useFieldValue<AdjustmentEditValues['accountId']>('accountId')
const accountCurrency = computed<CurrencyCode>(() => {
  const account = accounts.value?.find((a) => a.id === accountId.value)
  return account?.currency ?? DEFAULT_CURRENCY
})

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    await updateTransaction({
      id,
      payload: {
        version,
        accountId: data.accountId,
        amount: toMinorUnits(data.amount),
        description: data.description,
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
    <form id="edit-adjustment-form" class="flex flex-col gap-3" @submit="handleSubmit">
      <VeeField v-slot="{ value, setValue, errors }" name="amount">
        <Field :data-invalid="!!errors.length">
          <FieldLabel for="adjustment-amount">{{ t('fields.amount') }}</FieldLabel>
          <!-- Signed delta edited directly: unlike AmountField this input has
               no lower bound (the correction may lower the balance). -->
          <NumberField
            id="adjustment-amount"
            :model-value="value"
            :locale
            :format-options="{
              style: 'currency',
              currency: accountCurrency,
              currencyDisplay: 'symbol',
              currencySign: 'accounting',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }"
            :step="0.01"
            @update:model-value="(v) => setValue(v as number)"
          >
            <NumberFieldContent>
              <NumberFieldInput
                class="text-left px-2"
                :aria-invalid="!!errors.length"
              />
            </NumberFieldContent>
          </NumberField>
          <FieldError v-if="errors.length" :errors="errors" />
        </Field>
      </VeeField>

      <VeeField v-slot="{ value, setValue, errors }" name="accountId">
        <AccountSelect
          input-id="adjustment-account-id"
          :label="t('addTransaction.accountLabel')"
          :placeholder="t('addTransaction.accountPlaceholder')"
          class="w-full"
          :model-value="value"
          :errors="errors"
          @update:model-value="setValue"
        />
      </VeeField>

      <VeeField v-slot="{ field, errors }" name="description">
        <Field class="w-full md:min-w-56 md:flex-1" :data-invalid="!!errors.length">
          <FieldLabel for="adjustment-description">
            {{ t('addTransaction.descriptionLabel') }}
          </FieldLabel>
          <Input
            id="adjustment-description"
            :placeholder="t('addTransaction.descriptionPlaceholder')"
            v-bind="field"
            :aria-invalid="!!errors.length"
          />
          <FieldError v-if="errors.length" :errors="errors" />
        </Field>
      </VeeField>

      <DialogFooter class="-mx-6 -mb-6 mt-2 flex-col gap-3 border-t px-6 py-4 sm:flex-row">
        <DialogClose as-child>
          <Button type="button" variant="secondary" class="w-full sm:flex-1">
            {{ t('editTransaction.cancel') }}
          </Button>
        </DialogClose>
        <Button
          form="edit-adjustment-form"
          type="submit"
          class="w-full sm:flex-1"
          :loading="isSubmitting"
        >
          {{ t('editTransaction.submit') }}
        </Button>
      </DialogFooter>
    </form>
  </div>
</template>
