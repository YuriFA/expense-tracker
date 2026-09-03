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
import { createRenameHouseholdSchema, type RenameHouseholdFormValues } from '../model/rename-household-schema'

// Household rename (household-ux 3.2, owner only): one name field preloaded
// with the current display name; an emptied submission clears it (PATCH
// `name: null`). Mirrors the mobile rename sheet.
const { t } = useI18n()
const queryCache = useQueryCache()

const props = defineProps<{ initialName: string | null }>()

const open = ref(false)

const {
  handleSubmit: handleFormSubmit,
  isSubmitting,
} = useForm<RenameHouseholdFormValues>({
  validationSchema: toTypedSchema(createRenameHouseholdSchema()),
  initialValues: { name: props.initialName ?? '' },
})

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    await householdApi.rename(data.name.trim() || null)
    notification.success(t('household.renameSuccess'))
    queryCache.invalidateQueries({ key: ['household'] })
    open.value = false
  } catch (error) {
    const mapped = getHouseholdErrorMessage(error)
    if (mapped) {
      notification.error(mapped, { feature: 'household', action: 'rename' })
    } else {
      notification.mutationError(error, {
        title: t('household.renameTitle'),
        feature: 'household',
        action: 'rename',
      })
    }
  }
})
</script>

<template>
  <Button variant="ghost" data-testid="household-rename-button" @click="open = true">
    {{ t('household.rename') }}
  </Button>

  <ResponsiveDialog v-model:open="open">
    <template #title>{{ t('household.renameTitle') }}</template>
    <form id="rename-household-form" class="flex flex-col gap-3" @submit="handleSubmit">
      <VeeField v-slot="{ field, errors }" name="name">
        <Field :data-invalid="!!errors.length">
          <FieldLabel for="household-name">{{ t('household.renameLabel') }}</FieldLabel>
          <Input
            id="household-name"
            :placeholder="t('household.renameLabel')"
            maxlength="100"
            v-bind="field"
            :aria-invalid="!!errors.length"
          />
          <FieldError v-if="errors.length" :errors="errors" />
        </Field>
      </VeeField>
    </form>
    <template #footer>
      <Button form="rename-household-form" type="submit" :loading="isSubmitting">
        {{ t('household.rename') }}
      </Button>
    </template>
  </ResponsiveDialog>
</template>
