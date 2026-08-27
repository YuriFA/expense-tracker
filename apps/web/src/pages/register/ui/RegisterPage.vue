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
import { AlreadyExistsError } from '@/shared/lib/data'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({ email: '', password: '' })
const errors = ref<{ email?: string; password?: string; form?: string }>({})
const isSubmitting = ref(false)

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
})

async function submit() {
  errors.value = {}
  const parsed = schema.safeParse(form)
  if (!parsed.success) {
    errors.value.email = !form.email ? t('validation.enter', { field: t('auth.emailLabel') }) : undefined
    errors.value.password = form.password.length < 8
      ? t('validation.mustBeNonNegative', { field: t('auth.passwordLabel') })
      : undefined
    return
  }
  isSubmitting.value = true
  try {
    const result = await auth.register(form.email, form.password)
    if (!result.ok) {
      // The ownership gate was cancelled: the fresh session was signed back
      // out; the app stays in anonymous mode on the local owner's data.
      return
    }
    notification.success(t('auth.signUp'))
    // New accounts are not email-verified; nudge the user to verify. A
    // `redirect` query (e.g. back to an invitation link) rides along and is
    // honored after verification completes.
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.push(
      redirect ? { name: 'verify-email', query: { redirect } } : { name: 'verify-email' },
    )
  } catch (error) {
    if (error instanceof AlreadyExistsError) {
      errors.value.form = t('errors.alreadyExists')
    } else {
      notification.mutationError(error, { title: t('auth.signUp'), feature: 'session', action: 'register' })
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="mx-auto mt-10 max-w-sm">
    <h1 class="text-2xl font-semibold">{{ t('auth.signUp') }}</h1>
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
          autocomplete="new-password"
          :placeholder="t('auth.passwordPlaceholder')"
        />
        <FieldError v-if="errors.password" :errors="[errors.password]" />
      </Field>

      <p v-if="errors.form" class="text-sm text-destructive">{{ errors.form }}</p>

      <Button type="submit" :loading="isSubmitting">{{ t('auth.submitSignUp') }}</Button>

      <RouterLink :to="{ name: 'login' }" class="text-center text-sm text-muted-foreground hover:underline">
        {{ t('auth.haveAccount') }} {{ t('auth.signIn') }}
      </RouterLink>
    </form>
  </section>
</template>
