<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm, Field as VeeField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useQueryCache } from '@pinia/colada'
import { Button } from '@/shared/ui/button'
import { ResponsiveDialog } from '@/shared/ui/responsive-dialog'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { getHouseholdErrorMessage, householdApi } from '@/entities/household'
import { notification } from '@/shared/services/notification'
import { createInviteMemberSchema, type InviteMemberFormValues } from '../model/invite-member-schema'

// Invite by email (household-ux 3.2, owner only): one email field with inline
// validation; re-inviting a pending email refreshes its token/expiry. Mirrors
// the mobile invite sheet.
const { t } = useI18n()
const queryCache = useQueryCache()

const open = ref(false)

const {
  handleSubmit: handleFormSubmit,
  setFieldError,
  isSubmitting,
} = useForm<InviteMemberFormValues>({
  validationSchema: toTypedSchema(createInviteMemberSchema()),
  initialValues: { email: '' },
})

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    await householdApi.invite(data.email.trim())
    notification.success(t('household.inviteSuccess', { email: data.email.trim() }))
    queryCache.invalidateQueries({ key: ['household'] })
    open.value = false
  } catch (error) {
    const mapped = getHouseholdErrorMessage(error)
    if (mapped) {
      setFieldError('email', mapped)
    } else {
      notification.mutationError(error, {
        title: t('household.inviteTitle'),
        feature: 'household',
        action: 'invite',
      })
    }
  }
})
</script>

<template>
  <Button variant="secondary" data-testid="household-invite-button" @click="open = true">
    {{ t('household.inviteAction') }}
  </Button>

  <ResponsiveDialog v-model:open="open">
    <template #title>{{ t('household.inviteTitle') }}</template>
    <form id="invite-member-form" class="flex flex-col gap-3" @submit="handleSubmit">
      <VeeField v-slot="{ field, errors }" name="email">
        <Field :data-invalid="!!errors.length">
          <FieldLabel for="household-invite-email">
            {{ t('household.inviteEmailLabel') }}
          </FieldLabel>
          <Input
            id="household-invite-email"
            type="email"
            autocomplete="off"
            v-bind="field"
            :aria-invalid="!!errors.length"
          />
          <FieldError v-if="errors.length" :errors="errors" />
        </Field>
      </VeeField>
    </form>
    <template #footer>
      <Button form="invite-member-form" type="submit" :loading="isSubmitting">
        {{ t('household.inviteSubmit') }}
      </Button>
    </template>
  </ResponsiveDialog>
</template>
