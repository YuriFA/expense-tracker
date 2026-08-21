<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import z from 'zod'
import { Button } from '@/shared/ui/button'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/entities/session'
import { notification } from '@/shared/services/notification'
import { RateLimitedError, UnauthorizedError } from '@/shared/lib/data'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({ email: '', password: '' })
const errors = ref<{ email?: string; password?: string; form?: string }>({})
const isSubmitting = ref(false)
const retryAfter = ref<number>()

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

async function submit() {
  errors.value = {}
  const parsed = schema.safeParse(form)
  if (!parsed.success) {
    errors.value.form = t('auth.invalidCredentials')
    return
  }
  isSubmitting.value = true
  retryAfter.value = undefined
  try {
    await auth.login(form.email, form.password)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.push(redirect)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      errors.value.form = t('auth.invalidCredentials')
      notification.warning(t('auth.invalidCredentials'))
    } else if (error instanceof RateLimitedError) {
      retryAfter.value = error.retryAfter
      errors.value.form = t('auth.rateLimited', { seconds: error.retryAfter ?? 0 })
    } else {
      notification.mutationError(error, { title: t('auth.signIn'), feature: 'session', action: 'login' })
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="mx-auto mt-10 max-w-sm">
    <h1 class="text-2xl font-semibold">{{ t('auth.signIn') }}</h1>
    <form class="mt-6 flex flex-col gap-3" @submit.prevent="submit">
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

      <Field>
        <FieldLabel for="password">{{ t('auth.passwordLabel') }}</FieldLabel>
        <Input
          id="password"
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          :placeholder="t('auth.passwordPlaceholder')"
        />
        <FieldError v-if="errors.password" :errors="[errors.password]" />
      </Field>

      <p v-if="errors.form" class="text-sm text-destructive">{{ errors.form }}</p>

      <Button type="submit" :loading="isSubmitting">{{ t('auth.submitSignIn') }}</Button>

      <div class="flex flex-wrap items-center justify-between text-sm">
        <RouterLink :to="{ name: 'register' }" class="text-muted-foreground hover:underline">
          {{ t('auth.noAccount') }} {{ t('auth.signUp') }}
        </RouterLink>
        <RouterLink :to="{ name: 'reset-password' }" class="text-muted-foreground hover:underline">
          {{ t('auth.forgotPassword') }}
        </RouterLink>
      </div>
    </form>
  </section>
</template>
