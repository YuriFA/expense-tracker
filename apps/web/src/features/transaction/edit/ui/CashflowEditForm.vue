<script setup lang="ts">
import { useForm, useFieldValue, useSetFieldValue, Field as VeeField } from 'vee-validate'
import type { CashflowTransaction } from '@/entities/transaction'
import { toTypedSchema } from '@vee-validate/zod'
import { PlusIcon } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { DialogClose, DialogFooter } from '@/shared/ui/dialog'
import { DIALOG_FORM_FOOTER_CLASS } from '@/shared/ui/responsive-dialog'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { useI18n } from 'vue-i18n'
import { AmountField } from '@/shared/ui/amount-field'
import {
  AccountSelect,
  isNoAccount,
  NewAccountDialog,
  NO_ACCOUNT_ID,
  useAccounts,
} from '@/entities/account'
import { CategorySelect } from '@/entities/category'
import { useUpdateTransaction } from '@/entities/transaction'
import { notification } from '@/shared/services/notification'
import { createCashflowEditSchema, type CashflowEditValues } from '../model/cashflow-schema'
import { DEFAULT_CURRENCY, toMajorUnits, toMinorUnits, type CurrencyCode } from '@/shared/lib/money'
import { computed, ref } from 'vue'

const emit = defineEmits<{
  success: []
}>()

const { id, version, type, amount, description, accountId, categoryId } = defineProps<{
  id: string
  version: number
  type: 'expense' | 'income'
  amount: number
  description: string
  accountId: string | null
  categoryId: string
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
    // Account-less records edit through the «Без счета» sentinel choice.
    accountId: accountId ?? NO_ACCOUNT_ID,
    categoryId,
  },
})

const accountIdValue = useFieldValue<CashflowEditValues['accountId']>('accountId')
const accountCurrency = computed<CurrencyCode>(() => {
  const account = accounts.value?.find((a) => a.id === accountIdValue.value)
  return account?.currency ?? DEFAULT_CURRENCY
})

// Inline account creation (the CashflowForm contract): the created account
// is auto-selected in the triggering selector.
const newAccountOpen = ref(false)
const setAccountId = useSetFieldValue<CashflowEditValues['accountId']>('accountId')

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    await updateTransaction({
      id,
      payload: {
        version,
        type: data.type,
        // Sentinel -> null exactly once, at this mapper seam (PATCHing null
        // clears the reference through the local full-state upsert).
        accountId: isNoAccount(data.accountId) ? null : data.accountId,
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
          <div class="flex w-full items-end gap-2">
            <AccountSelect
              input-id="account-id"
              :label="t('addTransaction.accountLabel')"
              :placeholder="t('addTransaction.accountPlaceholder')"
              class="w-full"
              allow-none
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
        <VeeField v-slot="{ value, setValue, errors }" name="amount">
          <Field class="w-40" :data-invalid="!!errors.length">
            <FieldLabel for="cashflow-edit-amount">{{ t('fields.amount') }}</FieldLabel>
            <AmountField
              id="cashflow-edit-amount"
              class="w-full"
              :currency="accountCurrency"
              :model-value="value"
              :errors="errors"
              @update:model-value="(v) => setValue(v as number)"
            />
          </Field>
        </VeeField>
      </div>

      <VeeField v-slot="{ field, errors }" name="description">
        <Field class="w-full md:min-w-56 md:flex-1" :data-invalid="!!errors.length">
          <FieldLabel for="description">{{ t('addTransaction.descriptionLabel') }}</FieldLabel>
          <Input
            id="description"
            :placeholder="t('addTransaction.descriptionPlaceholder')"
            :model-value="field.value"
            :aria-invalid="!!errors.length"
            @update:model-value="field.onChange"
            @blur="field.onBlur"
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

      <DialogFooter :class="DIALOG_FORM_FOOTER_CLASS">
        <DialogClose as-child>
          <Button type="button" variant="secondary" class="w-full sm:flex-1">
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
    </form>

    <NewAccountDialog v-model:open="newAccountOpen" @created="setAccountId($event.id)" />
  </div>
</template>
