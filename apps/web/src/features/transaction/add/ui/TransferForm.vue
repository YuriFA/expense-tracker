<script setup lang="ts">
import { useForm, useFieldValue, useSetFieldValue, Field as VeeField } from 'vee-validate'
import { CalendarIcon } from '@lucide/vue'
import type { DateValue } from '@internationalized/date'
import { createTransferSchema, type TransferFormValues } from '../model/transfer-schema'
import { lastAccountIds } from '../model/last-account-ids'
import type { TransferTransaction } from '@/entities/transaction'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@/shared/ui/button'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { useI18n } from 'vue-i18n'
import { AmountField } from '@/shared/ui/amount-field'
import { AccountSelect, useAccounts } from '@/entities/account'
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
import { computed } from 'vue'

const emit = defineEmits<{
  success: []
}>()

const { cancellable = false } = defineProps<{
  /**
   * Dialog mode: renders the full-bleed footer with a context-closing
   * cancel button. Page-embedded usage keeps a plain submit row.
   */
  cancellable?: boolean
}>()

const initialOccurredAt = nowIsoString()

const { mutateAsync: createTransaction } = useCreateTransaction<TransferTransaction>()
const { t, locale } = useI18n()
const { data: accounts } = useAccounts()

const initial = lastAccountIds.getTransferAccountIds()

const {
  handleSubmit: handleFormSubmit,
  isSubmitting,
  setFieldError,
} = useForm<TransferFormValues>({
  validationSchema: toTypedSchema(createTransferSchema()),
  initialValues: {
    type: 'transfer',
    fromAccountId: initial.fromAccountId ?? '',
    toAccountId: initial.toAccountId ?? '',
    occurredAt: initialOccurredAt,
  },
})

const fromAccountId = useFieldValue<TransferFormValues['fromAccountId']>('fromAccountId')
const toAccountId = useFieldValue<TransferFormValues['toAccountId']>('toAccountId')

const fromCurrency = computed<CurrencyCode>(() => {
  const account = accounts.value?.find((a) => a.id === fromAccountId.value)
  return account?.currency ?? DEFAULT_CURRENCY
})

// Day-level choice, the initial clock time is preserved (see CashflowForm).
const occurredAt = useFieldValue<TransferFormValues['occurredAt']>('occurredAt')
const timeSuffix = initialOccurredAt.slice(10)
const selectedDay = computed(() => occurredAt.value.slice(0, 10))
const selectedDateValue = computed(() => toDateValue(selectedDay.value))
const occurredAtLabel = computed(() =>
  formatCalendarDay(selectedDay.value, locale.value, { dateStyle: 'long' }),
)
const setOccurredAt = useSetFieldValue<TransferFormValues['occurredAt']>('occurredAt')
const onDatePick = (value: DateValue | undefined) => {
  if (value) {
    setOccurredAt(`${fromDateValue(value)}${timeSuffix}`)
  }
}

const handleSubmit = handleFormSubmit(async (data) => {
  const fromAccount = accounts.value?.find((a) => a.id === data.fromAccountId)
  const toAccount = accounts.value?.find((a) => a.id === data.toAccountId)

  if (fromAccount && toAccount && fromAccount.currency !== toAccount.currency) {
    setFieldError('toAccountId', t('validation.transferAccountsMustMatchCurrency'))
    return
  }

  try {
    await createTransaction({
      type: data.type,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      amount: toMinorUnits(data.amount),
      description: data.description,
      occurredAt: data.occurredAt,
    })
    lastAccountIds.setTransferAccountIds(data.fromAccountId, data.toAccountId)
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
  <form id="add-transfer-form" class="flex flex-col gap-4" @submit="handleSubmit">
    <VeeField v-slot="{ value, setValue, errors }" name="amount">
      <Field :data-invalid="!!errors.length">
        <FieldLabel for="transfer-amount">{{ t('fields.amount') }}</FieldLabel>
        <AmountField
          hero
          :currency="fromCurrency"
          :model-value="value"
          :errors="errors"
          :placeholder="t('addTransfer.amountPlaceholder')"
          @update:model-value="(v) => setValue(v as number)"
        />
      </Field>
    </VeeField>

    <div class="grid gap-4 sm:grid-cols-2">
      <VeeField v-slot="{ value, setValue, errors }" name="fromAccountId">
        <AccountSelect
          input-id="from-account-id"
          :label="t('addTransfer.fromAccountLabel')"
          :placeholder="t('addTransfer.fromAccountPlaceholder')"
          class="w-full"
          :model-value="value"
          :errors="errors"
          :exclude-id="toAccountId"
          @update:model-value="setValue"
        />
      </VeeField>

      <VeeField v-slot="{ value, setValue, errors }" name="toAccountId">
        <AccountSelect
          input-id="to-account-id"
          :label="t('addTransfer.toAccountLabel')"
          :placeholder="t('addTransfer.toAccountPlaceholder')"
          class="w-full"
          :model-value="value"
          :errors="errors"
          :exclude-id="fromAccountId"
          @update:model-value="setValue"
        />
      </VeeField>
    </div>

    <VeeField v-slot="{ errors }" name="occurredAt">
      <Field :data-invalid="!!errors.length">
        <FieldLabel for="transfer-occurred-at">{{ t('fields.date') }}</FieldLabel>
        <Popover v-slot="{ close }">
          <PopoverTrigger as-child>
            <Button
              id="transfer-occurred-at"
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
  </form>

  <DialogFooter
    v-if="cancellable"
    class="-mx-6 -mb-6 mt-1 flex-col gap-3 border-t px-6 py-4 sm:flex-row"
  >
    <DialogClose as-child>
      <Button type="button" variant="outline" class="w-full sm:flex-1">
        {{ t('addTransfer.cancel') }}
      </Button>
    </DialogClose>
    <Button form="add-transfer-form" type="submit" class="w-full sm:flex-1" :loading="isSubmitting">
      {{ t('addTransfer.submit') }}
    </Button>
  </DialogFooter>
  <div v-else class="flex justify-end pt-1">
    <Button form="add-transfer-form" type="submit" class="w-full sm:w-auto" :loading="isSubmitting">
      {{ t('addTransfer.submit') }}
    </Button>
  </div>
</template>
