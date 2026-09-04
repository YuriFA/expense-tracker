<script setup lang="ts">
import { computed, ref } from 'vue'
import { useForm, useFieldValue, useSetFieldValue, Field as VeeField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { PlusIcon } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/shared/ui/button'
import { DialogClose, DialogFooter } from '@/shared/ui/dialog'
import { DIALOG_FORM_FOOTER_CLASS } from '@/shared/ui/responsive-dialog'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { AmountField } from '@/shared/ui/amount-field'
import { notification } from '@/shared/services/notification'
import { DEFAULT_CURRENCY, toMajorUnits, toMinorUnits, type CurrencyCode } from '@/shared/lib/money'
import { AccountSelect, NewAccountDialog, useAccounts } from '@/entities/account'
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

const { t } = useI18n()
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

// Inline account creation (the CashflowForm contract): the created account
// is auto-selected in the triggering selector.
const newAccountOpen = ref(false)
const setAccountId = useSetFieldValue<AdjustmentEditValues['accountId']>('accountId')

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
          <!-- Signed delta edited directly: the shared AmountField switches
               into signed mode here because the correction may lower the balance. -->
          <AmountField
            id="adjustment-amount"
            :model-value="value"
            :currency="accountCurrency"
            :errors="errors"
            mode="signed"
            @update:model-value="(v) => setValue(v as number)"
          />
        </Field>
      </VeeField>

      <VeeField v-slot="{ value, setValue, errors }" name="accountId">
        <div class="flex w-full items-end gap-2">
          <AccountSelect
            input-id="adjustment-account-id"
            :label="t('addTransaction.accountLabel')"
            :placeholder="t('addTransaction.accountPlaceholder')"
            class="w-full"
            :model-value="value"
            :errors="errors"
            @update:model-value="setValue"
          />
          <Button
            type="button"
            variant="outline"
            class="mb-0.5 size-9 shrink-0"
            :aria-label="t('addAccount.newAccount')"
            :title="t('addAccount.newAccount')"
            data-testid="open-new-account"
            @click="newAccountOpen = true"
          >
            <PlusIcon class="size-4" />
          </Button>
        </div>
      </VeeField>

      <VeeField v-slot="{ field, errors }" name="description">
        <Field class="w-full md:min-w-56 md:flex-1" :data-invalid="!!errors.length">
          <FieldLabel for="adjustment-description">
            {{ t('addTransaction.descriptionLabel') }}
          </FieldLabel>
          <Input
            id="adjustment-description"
            :placeholder="t('addTransaction.descriptionPlaceholder')"
            :model-value="field.value"
            :aria-invalid="!!errors.length"
            @update:model-value="field.onChange"
            @blur="field.onBlur"
          />
          <FieldError v-if="errors.length" :errors="errors" />
        </Field>
      </VeeField>

      <DialogFooter :class="DIALOG_FORM_FOOTER_CLASS">
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

    <NewAccountDialog v-model:open="newAccountOpen" @created="setAccountId($event.id)" />
  </div>
</template>
