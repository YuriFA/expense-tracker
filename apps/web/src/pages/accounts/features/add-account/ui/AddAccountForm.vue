<script setup lang="ts">
import { useForm } from 'vee-validate'
import {
  createAddAccountSchema,
  useCreateAccount,
  type AddAccountFormValues,
} from '@/entities/account'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@/shared/ui/button'
import { Field as VeeField } from 'vee-validate'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { AmountField } from '@/shared/ui/amount-field'
import { DEFAULT_CURRENCY, toMinorUnits } from '@/shared/lib/money'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { notification } from '@/shared/services/notification'

const emit = defineEmits<{
  success: []
}>()

const { t, locale } = useI18n()
const { mutateAsync: createAccount } = useCreateAccount()

const openingBalancePlaceholder = computed(() =>
  locale.value.startsWith('ru') ? '1000,00' : '1000.00',
)

const {
  handleSubmit: handleFormSubmit,
  setFieldValue,
  isSubmitting,
} = useForm<AddAccountFormValues>({
  validationSchema: toTypedSchema(createAddAccountSchema()),
  initialValues: {
    name: '',
    openingBalance: 0,
  },
})

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    await createAccount({
      name: data.name,
      // currency-rub-only: RUB is the app's only creation currency
      currency: DEFAULT_CURRENCY,
      openingBalance: toMinorUnits(data.openingBalance),
    })
    notification.success(t('addAccount.success'))
    emit('success')
  } catch (error) {
    notification.mutationError(error, {
      title: t('addAccount.error'),
      feature: 'account',
      action: 'create',
    })
  }
})
</script>

<template>
  <form id="add-account-form" class="flex flex-col gap-3" @submit="handleSubmit">
    <VeeField v-slot="{ field, errors }" name="name">
      <Field class="w-full md:min-w-56 md:flex-1" :data-invalid="!!errors.length">
        <FieldLabel for="name">{{ t('addAccount.nameLabel') }}</FieldLabel>
        <Input
          id="name"
          :placeholder="t('addAccount.namePlaceholder')"
          v-bind="field"
          :aria-invalid="!!errors.length"
        />
        <FieldError v-if="errors.length" :errors="errors" />
      </Field>
    </VeeField>

    <VeeField v-slot="{ field, errors }" name="openingBalance">
      <Field :data-invalid="!!errors.length">
        <FieldLabel for="opening-balance">{{ t('addAccount.openingBalanceLabel') }}</FieldLabel>
        <AmountField
          id="opening-balance"
          :model-value="field.value"
          :currency="DEFAULT_CURRENCY"
          :errors="errors"
          :placeholder="openingBalancePlaceholder"
          @update:model-value="
            (value) => {
              if (value !== undefined) {
                setFieldValue('openingBalance', value)
              } else {
                setFieldValue('openingBalance', undefined as unknown as number)
              }
            }
          "
        />
      </Field>
    </VeeField>
    <Button
      form="add-account-form"
      type="submit"
      class="w-full md:ml-auto md:w-auto"
      :loading="isSubmitting"
    >
      {{ t('addAccount.submit') }}
    </Button>
  </form>
</template>
