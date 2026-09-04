<script setup lang="ts">
import { useForm, useFieldValue, useSetFieldValue, Field as VeeField } from 'vee-validate'
import { PlusIcon } from '@lucide/vue'
import { createCashflowSchema, type CashflowFormValues } from '../model/cashflow-schema'
import { lastAccountIds } from '../model/last-account-ids'
import type { CashflowTransaction } from '@/entities/transaction'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@/shared/ui/button'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { useI18n } from 'vue-i18n'
import { AmountField } from '@/shared/ui/amount-field'
import { AccountSelect, isNoAccount, NewAccountDialog, useAccounts } from '@/entities/account'
import { CategorySelect } from '@/entities/category'
import NewCategoryDialog from './NewCategoryDialog.vue'
import { formatCalendarDay, nowIsoString } from '@/shared/lib/date'
import { useCreateTransaction } from '@/entities/transaction'
import { notification } from '@/shared/services/notification'
import { DEFAULT_CURRENCY, toMinorUnits, type CurrencyCode } from '@/shared/lib/money'
import { DialogClose, DialogFooter } from '@/shared/ui/dialog'
import { DIALOG_FORM_FOOTER_CLASS } from '@/shared/ui/responsive-dialog'
import { DateField } from '@/shared/ui/date-field'
import { computed, ref } from 'vue'

const emit = defineEmits<{
  success: []
}>()

const { type } = defineProps<{
  type: 'expense' | 'income'
}>()

const { mutateAsync: createTransaction } = useCreateTransaction<CashflowTransaction>()
const { t, locale } = useI18n()
const { data: accounts } = useAccounts()

const initialOccurredAt = nowIsoString()

const { handleSubmit: handleFormSubmit, isSubmitting } = useForm<CashflowFormValues>({
  validationSchema: toTypedSchema(createCashflowSchema()),
  initialValues: {
    type,
    accountId: lastAccountIds.getCashflowAccountId() ?? '',
    occurredAt: initialOccurredAt,
  },
})

const accountIdValue = useFieldValue<CashflowFormValues['accountId']>('accountId')
const accountCurrency = computed<CurrencyCode>(() => {
  const account = accounts.value?.find((a) => a.id === accountIdValue.value)
  return account?.currency ?? DEFAULT_CURRENCY
})

// Date picker: day-level choice, the initial clock time is preserved so
// "today" stays the exact current instant.
const occurredAt = useFieldValue<CashflowFormValues['occurredAt']>('occurredAt')
const timeSuffix = initialOccurredAt.slice(10)
const selectedDay = computed(() => occurredAt.value.slice(0, 10))
const occurredAtLabel = computed(() =>
  formatCalendarDay(selectedDay.value, locale.value, { dateStyle: 'long' }),
)
const setOccurredAt = useSetFieldValue<CashflowFormValues['occurredAt']>('occurredAt')
const onDatePick = (value: string) => {
  setOccurredAt(`${value}${timeSuffix}`)
}

// Inline category creation (anonymous local mode starts without categories).
const newCategoryOpen = ref(false)
const setCategoryId = useSetFieldValue<CashflowFormValues['categoryId']>('categoryId')

// Inline account creation: with zero accounts the form is a dead end (the
// NewCategoryDialog contract, account edition).
const newAccountOpen = ref(false)
const setAccountId = useSetFieldValue<CashflowFormValues['accountId']>('accountId')

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    await createTransaction({
      type: data.type,
      amount: toMinorUnits(data.amount),
      description: data.description,
      // «Без счета» sentinel -> null exactly once, at this mapper seam.
      accountId: isNoAccount(data.accountId) ? null : data.accountId,
      categoryId: data.categoryId,
      occurredAt: data.occurredAt,
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
  <form id="add-transaction-form" class="flex flex-col gap-4" @submit="handleSubmit">
    <VeeField v-slot="{ value, setValue, errors }" name="amount">
      <Field :data-invalid="!!errors.length">
        <FieldLabel for="amount">{{ t('fields.amount') }}</FieldLabel>
        <AmountField
          id="amount"
          :currency="accountCurrency"
          :model-value="value"
          :errors="errors"
          @update:model-value="(v) => setValue(v as number)"
        />
      </Field>
    </VeeField>

    <div class="grid gap-4 sm:grid-cols-2">
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

      <VeeField v-slot="{ value, setValue, errors }" name="categoryId">
        <div class="flex w-full items-end gap-2">
          <CategorySelect
            input-id="category-id"
            :label="t('addTransaction.categoryLabel')"
            :placeholder="t('addTransaction.categoryPlaceholder')"
            :type="type"
            class="w-full"
            :model-value="value"
            :errors="errors"
            @update:model-value="setValue"
          />
          <Button
            type="button"
            variant="outline"
            class="mb-0.5 size-9 shrink-0"
            :aria-label="t('addTransaction.newCategory')"
            :title="t('addTransaction.newCategory')"
            data-testid="open-new-category"
            @click="newCategoryOpen = true"
          >
            <PlusIcon class="size-4" />
          </Button>
        </div>
      </VeeField>
    </div>

    <VeeField v-slot="{ errors }" name="occurredAt">
      <Field :data-invalid="!!errors.length">
        <FieldLabel for="occurred-at">{{ t('fields.date') }}</FieldLabel>
        <DateField
          input-id="occurred-at"
          :model-value="selectedDay"
          :placeholder="occurredAtLabel"
          :aria-invalid="!!errors.length"
          @update:model-value="onDatePick"
        />
        <FieldError v-if="errors.length" :errors="errors" />
      </Field>
    </VeeField>

    <VeeField v-slot="{ field, errors }" name="description">
      <Field class="w-full" :data-invalid="!!errors.length">
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
  </form>

  <NewCategoryDialog
    v-model:open="newCategoryOpen"
    :type="type"
    @created="setCategoryId($event.id)"
  />

  <NewAccountDialog v-model:open="newAccountOpen" @created="setAccountId($event.id)" />

  <DialogFooter :class="DIALOG_FORM_FOOTER_CLASS">
    <DialogClose as-child>
      <Button type="button" variant="secondary" class="w-full sm:flex-1">
        {{ t('addTransaction.cancel') }}
      </Button>
    </DialogClose>
    <Button
      form="add-transaction-form"
      type="submit"
      class="w-full sm:flex-1"
      :loading="isSubmitting"
    >
      {{ t('addTransaction.submit') }}
    </Button>
  </DialogFooter>
</template>
