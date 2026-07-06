<script setup lang="ts">
import { useForm } from 'vee-validate'
import { createEditAccountSchema, type EditAccountFormValues } from '../model/edit-account-schema'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@/shared/ui/button'
import { Field as VeeField } from 'vee-validate'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { NumberField, NumberFieldContent, NumberFieldInput } from '@/shared/ui/number-field'
import { type Account } from '@/entities/account'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { notification } from '@/shared/services/notification'
import { useUpdateAccount } from '@/entities/account/model/use-accounts'
import { toMinorUnits } from '@/shared/lib/money'

const emit = defineEmits<{
  success: []
}>()

const { account } = defineProps<{
  account: Account
}>()

const { t, locale } = useI18n()
const { mutateAsync: updateAccount } = useUpdateAccount()

const openingBalancePlaceholder = computed(() => `${(1000).toFixed(2)}`)

const {
  handleSubmit: handleFormSubmit,
  setFieldValue,
  isSubmitting,
} = useForm<EditAccountFormValues>({
  validationSchema: toTypedSchema(createEditAccountSchema()),
  initialValues: {
    name: account.name,
    manualAdjustment: account.manualAdjustment,
  },
})

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    await updateAccount({
      id: account.id,
      payload: {
        name: data.name,
        manualAdjustment: toMinorUnits(data.manualAdjustment),
      },
    })
    notification.success(t('editAccount.success'))
    emit('success')
  } catch (error) {
    notification.mutationError(error, {
      title: t('editAccount.error'),
      feature: 'account',
      action: 'create',
    })
  }
})
</script>

<template>
  <form id="edit-account-form" class="flex flex-col gap-3" @submit="handleSubmit">
    <VeeField v-slot="{ field, errors }" name="name">
      <Field class="w-full md:min-w-56 md:flex-1" :data-invalid="!!errors.length">
        <FieldLabel for="name">{{ t('editAccount.nameLabel') }}</FieldLabel>
        <Input
          id="name"
          :placeholder="t('editAccount.namePlaceholder')"
          v-bind="field"
          :aria-invalid="!!errors.length"
        />
        <FieldError v-if="errors.length" :errors="errors" />
      </Field>
    </VeeField>

    <VeeField v-slot="{ field, errors }" name="openingBalance">
      <Field :data-invalid="!!errors.length">
        <FieldLabel for="opening-balance">{{ t('editAccount.openingBalanceLabel') }}</FieldLabel>
        <NumberField
          id="opening-balance"
          :locale
          :format-options="{
            style: 'currency',
            currency: account.currency,
            currencyDisplay: 'symbol',
            currencySign: 'accounting',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }"
          :min="0"
          :step="0.01"
          :model-value="field.value"
          @update:model-value="
            (value) => {
              if (value) {
                setFieldValue('manualAdjustment', value)
              } else {
                setFieldValue('manualAdjustment', undefined as unknown as number)
              }
            }
          "
        >
          <NumberFieldContent>
            <NumberFieldInput
              class="text-left px-2"
              :placeholder="openingBalancePlaceholder"
              :aria-invalid="!!errors.length"
            />
          </NumberFieldContent>
        </NumberField>
        <FieldError v-if="errors.length" :errors="errors" />
      </Field>
    </VeeField>
    <Button
      form="edit-account-form"
      type="submit"
      class="w-full md:ml-auto md:w-auto"
      :loading="isSubmitting"
    >
      {{ t('editAccount.submit') }}
    </Button>
  </form>
</template>
