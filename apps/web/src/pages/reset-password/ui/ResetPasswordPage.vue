<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import z from 'zod'
import { Button } from '@/shared/ui/button'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { sessionApi } from '@/entities/session'
import { notification } from '@/shared/services/notification'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// A `?token=` (magic link) puts the page straight into the confirm step.
const mode = ref<'request' | 'confirm'>(
  typeof route.query.token === 'string' && route.query.token.length > 0 ? 'confirm' : 'request',
)
const form = reactive({ email: '', token: (route.query.token as string) ?? '', newPassword: '' })
const errors = ref<{ email?: string; token?: string; newPassword?: string }>({})
const isSubmitting = ref(false)
const requested = ref(false)

const requestSchema = z.object({ email: z.string().email() })
const confirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(72),
})

const confirmDescription = computed(() => t('auth.confirmResetDescription'))

async function requestReset() {
  errors.value = {}
  if (!requestSchema.safeParse(form).success) {
    errors.value.email = t('validation.enter', { field: t('auth.emailLabel') })
    return
  }
  isSubmitting.value = true
  try {
    await sessionApi.requestPasswordReset(form.email)
    // Anti-enumeration: the backend always returns 204. Tell the user the same.
    requested.value = true
    notification.success(t('auth.resetRequested'))
  } catch (error) {
    notification.mutationError(error, { title: t('auth.resetPasswordTitle'), feature: 'session', action: 'password-reset' })
  } finally {
    isSubmitting.value = false
  }
}

async function confirmReset() {
  errors.value = {}
  if (!confirmSchema.safeParse(form).success) {
    if (form.token.length === 0) errors.value.token = t('validation.enter', { field: t('auth.resetTokenLabel') })
    if (form.newPassword.length < 8) {
      errors.value.newPassword = t('validation.mustBeNonNegative', { field: t('auth.passwordLabel') })
    }
    return
  }
  isSubmitting.value = true
  try {
    await sessionApi.confirmPasswordReset(form.token, form.newPassword)
    notification.success(t('auth.passwordReset'))
    await router.push({ name: 'login' })
  } catch (error) {
    notification.mutationError(error, { title: t('auth.confirmResetTitle'), feature: 'session', action: 'password-reset' })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="mx-auto mt-10 max-w-sm">
    <h1 class="text-2xl font-semibold">{{ t('auth.resetPasswordTitle') }}</h1>

    <template v-if="mode === 'request'">
      <p class="mt-2 text-sm text-muted-foreground">{{ t('auth.resetPasswordDescription') }}</p>
      <form v-if="!requested" class="mt-6 flex flex-col gap-3" @submit.prevent="requestReset">
        <Field>
          <FieldLabel for="email">{{ t('auth.emailLabel') }}</FieldLabel>
          <Input
            id="email"
            v-model="form.email"
            type="email"
            autocomplete="email"
            :placeholder="t('auth.emailPlaceholder')"
          />
          <FieldError v-if="errors.email" :errors="[errors.email]" />
        </Field>
        <Button type="submit" :loading="isSubmitting">{{ t('auth.submitReset') }}</Button>
      </form>
      <p v-else class="mt-6 text-sm text-muted-foreground">{{ t('auth.resetRequested') }}</p>
    </template>

    <template v-else>
      <p class="mt-2 text-sm text-muted-foreground">{{ confirmDescription }}</p>
      <form class="mt-6 flex flex-col gap-3" @submit.prevent="confirmReset">
        <Field>
          <FieldLabel for="token">{{ t('auth.resetTokenLabel') }}</FieldLabel>
          <Input
            id="token"
            v-model="form.token"
            autocomplete="off"
            :placeholder="t('auth.resetTokenPlaceholder')"
          />
          <FieldError v-if="errors.token" :errors="[errors.token]" />
        </Field>
        <Field>
          <FieldLabel for="new-password">{{ t('auth.newPasswordLabel') }}</FieldLabel>
          <Input
            id="new-password"
            v-model="form.newPassword"
            type="password"
            autocomplete="new-password"
            :placeholder="t('auth.passwordPlaceholder')"
          />
          <FieldError v-if="errors.newPassword" :errors="[errors.newPassword]" />
        </Field>
        <Button type="submit" :loading="isSubmitting">{{ t('auth.submitConfirmReset') }}</Button>
      </form>
    </template>

    <RouterLink :to="{ name: 'login' }" class="mt-6 inline-block text-center text-sm text-muted-foreground hover:underline">
      {{ t('auth.backToSignIn') }}
    </RouterLink>
  </section>
</template>
