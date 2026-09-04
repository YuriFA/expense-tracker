<script setup lang="ts">
import { computed } from 'vue'
import { useForm, useFieldValue, Field as VeeField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useI18n } from 'vue-i18n'
import { Button } from '@/shared/ui/button'
import { DialogClose } from '@/shared/ui/dialog'
import { ResponsiveDialog } from '@/shared/ui/responsive-dialog'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { AmountField } from '@/shared/ui/amount-field'
import { notification } from '@/shared/services/notification'
import { formatMoney, toMinorUnits, toMajorUnits } from '@/shared/lib/money'
import type { AccountWithBalance } from '@/entities/account'
import { useCreateTransaction, type AdjustmentTransaction } from '@/entities/transaction'
import {
  createReconcileAccountSchema,
  type ReconcileAccountFormValues,
} from '../model/reconcile-account-schema'

const emit = defineEmits<{
  success: []
}>()

// Single-context form: it owns its dialog shell (title + pinned #footer);
// multi-form containers embed forms instead (DIALOG_FORM_FOOTER_CLASS).
const open = defineModel<boolean>('open', { default: false })

const { account } = defineProps<{
  account: AccountWithBalance
}>()

const { t, locale } = useI18n()
const { mutateAsync: createTransaction } = useCreateTransaction<AdjustmentTransaction>()

const { handleSubmit: handleFormSubmit, isSubmitting } = useForm<ReconcileAccountFormValues>({
  validationSchema: toTypedSchema(createReconcileAccountSchema()),
  initialValues: {
    targetBalance: toMajorUnits(account.balance),
  },
})

// The client-computed reconciliation delta (design D1): the user states the
// actual balance; the adjustment transaction carries the difference.
const targetBalance = useFieldValue<ReconcileAccountFormValues['targetBalance']>('targetBalance')
const deltaMinor = computed(() => {
  if (targetBalance.value === undefined) return null
  return toMinorUnits(targetBalance.value) - account.balance
})
const isZeroDelta = computed(() => deltaMinor.value === 0)
const deltaLabel = computed(() => {
  if (deltaMinor.value === null || deltaMinor.value === 0) return ''
  return formatMoney(Math.abs(deltaMinor.value), account.currency, locale.value)
})

const handleSubmit = handleFormSubmit(async (data) => {
  const amount = toMinorUnits(data.targetBalance) - account.balance
  if (amount === 0) return

  try {
    await createTransaction({
      type: 'adjustment',
      amount,
      description: data.note ?? '',
      occurredAt: new Date().toISOString(),
      accountId: account.id,
    })
    notification.success(t('reconcileAccount.success'))
    open.value = false
    emit('success')
  } catch (error) {
    notification.mutationError(error, {
      title: t('reconcileAccount.error'),
      feature: 'transaction',
      action: 'create',
    })
  }
})
</script>

<template>
  <ResponsiveDialog v-model:open="open">
    <template #title>{{ t('reconcileAccount.title', { name: account.name }) }}</template>

    <form id="reconcile-account-form" class="flex flex-col gap-3" @submit="handleSubmit">
      <VeeField v-slot="{ value, setValue, errors }" name="targetBalance">
        <Field :data-invalid="!!errors.length">
          <FieldLabel for="reconcile-balance">
            {{ t('reconcileAccount.balanceLabel') }}
          </FieldLabel>
          <AmountField
            id="reconcile-balance"
            :currency="account.currency"
            :model-value="value"
            :errors="errors"
            @update:model-value="(v) => setValue(v as number)"
          />
          <FieldError v-if="errors.length" :errors="errors" />
        </Field>
      </VeeField>

      <p
        class="text-xs"
        :class="isZeroDelta ? 'text-muted-foreground' : 'font-medium text-primary'"
        data-testid="reconcile-delta-preview"
      >
        {{
          isZeroDelta
            ? t('reconcileAccount.deltaZero')
            : deltaMinor! > 0
              ? t('reconcileAccount.deltaAdded', { amount: deltaLabel })
              : t('reconcileAccount.deltaRemoved', { amount: deltaLabel })
        }}
      </p>

      <VeeField v-slot="{ field, errors }" name="note">
        <Field class="w-full" :data-invalid="!!errors.length">
          <FieldLabel for="reconcile-note">{{ t('reconcileAccount.noteLabel') }}</FieldLabel>
          <Input
            id="reconcile-note"
            :placeholder="t('reconcileAccount.notePlaceholder')"
            :model-value="field.value"
            :aria-invalid="!!errors.length"
            @update:model-value="field.onChange"
            @blur="field.onBlur"
          />
          <FieldError v-if="errors.length" :errors="errors" />
        </Field>
      </VeeField>
    </form>

    <template #footer>
      <DialogClose as-child>
        <Button type="button" variant="secondary" class="w-full sm:flex-1">
          {{ t('editTransaction.cancel') }}
        </Button>
      </DialogClose>
      <Button
        form="reconcile-account-form"
        type="submit"
        class="w-full sm:flex-1"
        :loading="isSubmitting"
        :disabled="isZeroDelta"
        data-testid="reconcile-submit"
      >
        {{ t('reconcileAccount.submit') }}
      </Button>
    </template>
  </ResponsiveDialog>
</template>
