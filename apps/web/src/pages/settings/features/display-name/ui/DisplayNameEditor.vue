<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm, Field as VeeField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useQueryCache } from '@pinia/colada'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardTitle } from '@/shared/ui/card'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { getHouseholdErrorMessage, householdApi } from '@/entities/household'
import { notification } from '@/shared/services/notification'
import { createDisplayNameSchema, type DisplayNameFormValues } from '../model/display-name-schema'

// Display-name editor (household-ux 3.5): the name household members see,
// with the live member-view preview and the email fallback when the field is
// cleared (the v1 API cannot reset the name - empty is invalid). Mirrors the
// mobile display-name sheet.
const { t } = useI18n()
const queryCache = useQueryCache()

const props = defineProps<{
  email: string
  /** The user's current display name (from the household member entry). */
  initialName: string
}>()

const {
  handleSubmit: handleFormSubmit,
  values,
  isSubmitting,
} = useForm<DisplayNameFormValues>({
  validationSchema: toTypedSchema(createDisplayNameSchema()),
  initialValues: { displayName: props.initialName },
})

const typedName = computed(() => values.displayName?.trim())
const preview = computed(() =>
  typedName.value
    ? t('profile.displayNamePreview', { name: typedName.value })
    : t('profile.displayNameEmailFallback', { email: props.email }),
)

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    await householdApi.updateDisplayName(data.displayName.trim())
    notification.success(t('profile.saved'))
    queryCache.invalidateQueries({ key: ['household'] })
  } catch (error) {
    const mapped = getHouseholdErrorMessage(error)
    if (mapped) notification.error(mapped, { feature: 'household', action: 'update-display-name' })
    else
      notification.mutationError(error, {
        title: t('profile.displayName'),
        feature: 'household',
        action: 'update-display-name',
      })
  }
})
</script>

<template>
  <Card data-testid="settings-profile-card">
    <CardContent class="flex flex-col gap-4">
      <!-- Row header (design system): section title + email on the right. -->
      <div class="flex items-center justify-between gap-3">
        <CardTitle class="text-sm font-semibold">{{ t('profile.title') }}</CardTitle>
        <span class="truncate text-xs text-muted-foreground" data-testid="settings-profile-email">
          {{ email }}
        </span>
      </div>
      <form id="display-name-form" class="flex flex-col gap-3" @submit="handleSubmit">
        <VeeField v-slot="{ field, errors }" name="displayName">
          <Field :data-invalid="!!errors.length">
            <FieldLabel
              for="profile-display-name"
              class="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              {{ t('profile.displayName') }}
            </FieldLabel>
            <Input
              id="profile-display-name"
              :placeholder="t('profile.displayNamePlaceholder')"
              maxlength="100"
              v-bind="field"
              :aria-invalid="!!errors.length"
            />
            <FieldError v-if="errors.length" :errors="errors" />
          </Field>
        </VeeField>
        <p class="text-xs text-muted-foreground" data-testid="settings-profile-preview">
          {{ preview }}
        </p>
        <Button
          form="display-name-form"
          type="submit"
          :loading="isSubmitting"
          data-testid="settings-profile-save"
          class="self-start bg-accent text-primary hover:bg-accent/80 hover:text-primary"
        >
          {{ t('profile.save') }}
        </Button>
      </form>
    </CardContent>
  </Card>
</template>
