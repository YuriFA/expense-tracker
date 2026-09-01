<script setup lang="ts">
import { useForm } from 'vee-validate'
import { createEditAccountSchema, type EditAccountFormValues } from '../model/edit-account-schema'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@/shared/ui/button'
import { Field as VeeField } from 'vee-validate'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import type { Account } from '@/entities/account'
import { useI18n } from 'vue-i18n'
import { notification } from '@/shared/services/notification'
import { useUpdateAccount } from '@/entities/account'

const emit = defineEmits<{
  success: []
}>()

const { account } = defineProps<{
  account: Account
}>()

const { t } = useI18n()
const { mutateAsync: updateAccount } = useUpdateAccount()

const { handleSubmit: handleFormSubmit, isSubmitting } = useForm<EditAccountFormValues>({
  validationSchema: toTypedSchema(createEditAccountSchema()),
  initialValues: {
    name: account.name,
  },
})

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    await updateAccount({
      id: account.id,
      payload: {
        name: data.name,
        version: account.version,
      },
    })
    notification.success(t('editAccount.success'))
    emit('success')
  } catch (error) {
    notification.mutationError(error, {
      title: t('editAccount.error'),
      feature: 'account',
      action: 'update',
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
