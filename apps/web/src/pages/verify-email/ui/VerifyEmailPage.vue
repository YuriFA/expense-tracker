<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Button } from '@/shared/ui/button'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { useAuthStore, sessionApi } from '@/entities/session'
import { notification } from '@/shared/services/notification'
import { AlreadyExistsError, RateLimitedError } from '@/shared/lib/data'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const code = ref('')
const error = ref<string>()
const isSubmitting = ref(false)
const isVerified = computed(() => auth.user?.emailVerified ?? false)

// Resend throttle countdown (seconds), driven by the backend's Retry-After.
const resendIn = ref(0)
const resendError = ref<string>()
let timer: ReturnType<typeof setInterval> | undefined

function startCountdown(seconds: number) {
  resendIn.value = seconds
  clearInterval(timer)
  timer = setInterval(() => {
    if (resendIn.value > 0) resendIn.value -= 1
    else clearInterval(timer)
  }, 1000)
}
onUnmounted(() => clearInterval(timer))

async function verify() {
  error.value = undefined
  if (code.value.length !== 6) {
    error.value = t('auth.codePlaceholder')
    return
  }
  isSubmitting.value = true
  try {
    await sessionApi.verifyEmail(code.value)
    await auth.refreshUser()
    notification.success(t('auth.verifySuccess'))
    // A carried `redirect` (e.g. back to an invitation link from the
    // register entry) is honored now that verification is done.
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.push(redirect)
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    isSubmitting.value = false
  }
}

async function resend() {
  resendError.value = undefined
  try {
    await sessionApi.resendVerification()
    notification.success(t('auth.resendSent'))
  } catch (err) {
    if (err instanceof RateLimitedError) {
      startCountdown(err.retryAfter ?? 60)
    } else {
      resendError.value = errorMessage(err)
    }
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof AlreadyExistsError) return t('auth.emailVerified')
  if (err instanceof RateLimitedError) {
    return t('auth.rateLimited', { seconds: err.retryAfter ?? 0 })
  }
  return t('errors.generic')
}
</script>

<template>
  <section class="mx-auto mt-10 max-w-sm">
    <h1 class="text-2xl font-semibold">{{ t('auth.verifyEmailTitle') }}</h1>
    <p class="mt-2 text-sm text-muted-foreground">{{ t('auth.verifyEmailDescription') }}</p>

    <div v-if="isVerified" class="mt-6 rounded-md border border-border p-4 text-sm">
      <p>{{ t('auth.emailVerified') }}</p>
      <RouterLink
        :to="{ name: 'home' }"
        class="mt-2 inline-block text-muted-foreground hover:underline"
      >
        {{ t('nav.dashboard') }}
      </RouterLink>
    </div>

    <form v-else class="mt-6 flex flex-col gap-3" @submit.prevent="verify">
      <Field>
        <FieldLabel for="code">{{ t('auth.codeLabel') }}</FieldLabel>
        <Input
          id="code"
          v-model="code"
          inputmode="numeric"
          maxlength="6"
          autocomplete="one-time-code"
          :placeholder="t('auth.codePlaceholder')"
        />
        <FieldError v-if="error" :errors="[error]" />
      </Field>

      <Button type="submit" :loading="isSubmitting">{{ t('auth.submitVerify') }}</Button>

      <div class="flex items-center justify-between text-sm">
        <Button variant="ghost" type="button" :disabled="resendIn > 0" @click="resend">
          {{ resendIn > 0 ? `${t('auth.submitResend')} (${resendIn}s)` : t('auth.submitResend') }}
        </Button>
        <RouterLink :to="{ name: 'login' }" class="text-muted-foreground hover:underline">
          {{ t('auth.backToSignIn') }}
        </RouterLink>
      </div>
      <p v-if="resendError" class="text-sm text-destructive">{{ resendError }}</p>
    </form>
  </section>
</template>
