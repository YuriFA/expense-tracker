<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useForm, Field as VeeField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@/shared/ui/button'
import { ResponsiveDialog } from '@/shared/ui/responsive-dialog'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { getHouseholdApiErrorCode, householdApi } from '@/entities/household'
import { useHouseholdJoinStore } from '@/features/household-join'
import { notification } from '@/shared/services/notification'
import { createJoinByCodeSchema, type JoinByCodeFormValues } from '../model/join-by-code-schema'

// Join-by-code entry (household-join design D6): the code form in a dialog;
// a successful join hands the NEW household to the shared choice dialog
// (carry/clean) and lands the user on home.
const { t } = useI18n()
const router = useRouter()
const join = useHouseholdJoinStore()

const open = ref(false)

const {
  handleSubmit: handleFormSubmit,
  setFieldError,
  isSubmitting,
} = useForm<JoinByCodeFormValues>({
  validationSchema: toTypedSchema(createJoinByCodeSchema()),
  initialValues: { code: '' },
})

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    const household = await householdApi.joinByCode(data.code)
    notification.success(t('household.joinSuccess'))
    open.value = false
    await join.chooseHouseholdData(household)
    await router.push({ name: 'home' })
  } catch (error) {
    if (getHouseholdApiErrorCode(error) === 'HOUSEHOLD_CODE_INVALID') {
      setFieldError('code', t('household.errors.codeInvalid'))
    } else {
      notification.mutationError(error, {
        title: t('household.joinByCodeTitle'),
        feature: 'household',
        action: 'join',
      })
    }
  }
})
</script>

<template>
  <Button variant="secondary" data-testid="household-join-code-button" @click="open = true">
    {{ t('household.joinByCode') }}
  </Button>

  <ResponsiveDialog v-model:open="open">
    <template #title>{{ t('household.joinByCodeTitle') }}</template>
    <form id="join-household-form" class="flex flex-col gap-3" @submit="handleSubmit">
      <VeeField v-slot="{ field, errors }" name="code">
        <Field :data-invalid="!!errors.length">
          <FieldLabel for="household-code">{{ t('household.codeLabel') }}</FieldLabel>
          <Input
            id="household-code"
            :placeholder="t('household.codePlaceholder')"
            autocomplete="off"
            class="uppercase"
            v-bind="field"
            :aria-invalid="!!errors.length"
          />
          <FieldError v-if="errors.length" :errors="errors" />
        </Field>
      </VeeField>
    </form>
    <template #footer>
      <Button form="join-household-form" type="submit" :loading="isSubmitting">
        {{ t('household.join') }}
      </Button>
    </template>
  </ResponsiveDialog>
</template>
