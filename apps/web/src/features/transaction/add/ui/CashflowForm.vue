<script setup lang="ts">
import { useForm, useFieldValue, useSetFieldValue, Field as VeeField } from 'vee-validate'
import { CalendarIcon, PlusIcon } from '@lucide/vue'
import type { DateValue } from '@internationalized/date'
import { createCashflowSchema, type CashflowFormValues } from '../model/cashflow-schema'
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
import NewCategoryDialog from './NewCategoryDialog.vue'
import {
  currentDay,
  formatCalendarDay,
  fromDateValue,
  nowIsoString,
  toDateValue,
} from '@/shared/lib/date'
import { useCreateTransaction } from '@/entities/transaction'
import { notification } from '@/shared/services/notification'
import { DEFAULT_CURRENCY, toMinorUnits, type CurrencyCode } from '@/shared/lib/money'
import { Calendar } from '@/shared/ui/calendar'
import { DialogClose, DialogFooter } from '@/shared/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { computed, ref } from 'vue'

const emit = defineEmits<{
  success: []
}>()

const { type, cancellable = false } = defineProps<{
  type: 'expense' | 'income'
  /**
   * Dialog mode: renders the full-bleed footer with a context-closing
   * cancel button. Page-embedded usage (income quick entry) keeps a plain
   * submit row - DialogClose has no DialogRoot there.
   */
  cancellable?: boolean
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
const selectedDateValue = computed(() => toDateValue(selectedDay.value))
const occurredAtLabel = computed(() =>
  formatCalendarDay(selectedDay.value, locale.value, { dateStyle: 'long' }),
)
const setOccurredAt = useSetFieldValue<CashflowFormValues['occurredAt']>('occurredAt')
const onDatePick = (value: DateValue | undefined) => {
  if (value) {
    setOccurredAt(`${fromDateValue(value)}${timeSuffix}`)
  }
}

// Inline category creation (anonymous local mode starts without categories).
const newCategoryOpen = ref(false)
const setCategoryId = useSetFieldValue<CashflowFormValues['categoryId']>('categoryId')

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    await createTransaction({
      type: data.type,
      amount: toMinorUnits(data.amount),
      description: data.description,
      accountId: data.accountId,
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
          hero
          :currency="accountCurrency"
          :model-value="value"
          :errors="errors"
          @update:model-value="(v) => setValue(v as number)"
        />
      </Field>
    </VeeField>

    <div class="grid gap-4 sm:grid-cols-2">
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
        <Popover v-slot="{ close }">
          <PopoverTrigger as-child>
            <Button
              id="occurred-at"
              type="button"
              variant="outline"
              class="w-full justify-between text-left font-normal"
              :aria-invalid="!!errors.length"
            >
              <span>{{ occurredAtLabel }}</span>
              <CalendarIcon class="text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0" align="start">
            <Calendar
              :model-value="selectedDateValue"
              :default-placeholder="toDateValue(currentDay())"
              layout="month-and-year"
              initial-focus
              @update:model-value="
                (v) => {
                  onDatePick(v)
                  close()
                }
              "
            />
          </PopoverContent>
        </Popover>
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

  <DialogFooter
    v-if="cancellable"
    class="-mx-6 -mb-6 flex-col gap-3 border-t px-6 py-4 sm:flex-row"
  >
    <DialogClose as-child>
      <Button type="button" variant="outline" class="w-full sm:flex-1">
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
  <div v-else class="flex justify-end pt-1">
    <Button
      form="add-transaction-form"
      type="submit"
      class="w-full sm:w-auto"
      :loading="isSubmitting"
    >
      {{ t('addTransaction.submit') }}
    </Button>
  </div>
</template>
