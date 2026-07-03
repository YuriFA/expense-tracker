<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@/shared/ui/button'
import { useI18n } from 'vue-i18n'
import { useCreateAccount } from '@/entities/account/use-accounts'
import { createAddAccountSchema, type AddAccountFormValues } from './validation/add-account-schema'
import { Field as VeeField } from 'vee-validate'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { NumberField, NumberFieldContent, NumberFieldInput } from '@/shared/ui/number-field'
import { useSettingsStore } from '@/shared/stores/use-settings-store'
import { formatCurrency } from '@/shared/lib/money/format'
import { computed } from 'vue'
import { notification } from '@/shared/services/notification'

const emit = defineEmits<{
  success: []
}>()

const { t, locale } = useI18n()
const settings = useSettingsStore()
const { mutateAsync: createAccount } = useCreateAccount()
const openingBalancePlaceholder = computed(() =>
  formatCurrency(1000, settings.currency, locale.value),
)

const { handleSubmit: handleFormSubmit, setFieldValue } = useForm<AddAccountFormValues>({
  validationSchema: toTypedSchema(createAddAccountSchema()),
  initialValues: {
    name: '',
    openingBalance: 0,
  },
})

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    await createAccount(data)
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
        <NumberField
          id="opening-balance"
          :locale
          :format-options="{
            style: 'currency',
            currency: settings.currency,
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
                setFieldValue('openingBalance', value)
              } else {
                setFieldValue('openingBalance', undefined as unknown as number)
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
    <Button form="add-account-form" type="submit" class="w-full md:ml-auto md:w-auto">
      {{ t('addAccount.submit') }}
    </Button>
  </form>
</template>
