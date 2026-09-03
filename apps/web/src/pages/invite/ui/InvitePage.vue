<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@pinia/colada'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { ErrorState } from '@/shared/ui/error-state'
import { Spinner } from '@/shared/ui/spinner'
import {
  getHouseholdApiErrorCode,
  getHouseholdErrorMessage,
  householdApi,
} from '@/entities/household'
import { useAuthStore } from '@/entities/session'
import { UnauthorizedError } from '@/shared/lib/data'
import { AcceptInvitationForm } from '../features/accept-invitation'

// The invitation accept screen (household-join design D6). States:
// - loading while the preview is in flight,
// - unauthenticated (401 from the preview) → a CTA card to
//   login/register carrying the invite path as the `redirect` query,
// - wrong account (403 EMAIL_MISMATCH) → a card naming the signed-in email,
// - dead invitations (expired / revoked / accepted / not found) → a dead
//   card with a «На главную» link,
// - success → the accept form (choice decided inline, no second dialog).
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const token = computed(() => String(route.params.token ?? ''))
const invitePath = computed(() => `/invite/${token.value}`)

// Fires once the session restore settled: the preview needs the session
// cookie, so a signed-in visitor previews directly even though the auth
// store may still be `restoring` during the first roundtrip.
const previewQuery = useQuery({
  key: () => ['invite-preview', token.value],
  query: () => householdApi.previewInvitation(token.value),
  enabled: () => auth.status !== 'restoring',
  retry: 0,
})

// "No data yet" (pending): also covers the session-restore wait while the
// query is disabled - the preview has neither data nor an error yet.
const isPending = computed(() => previewQuery.isPending.value)
const isAnonymous = computed(() => previewQuery.error.value instanceof UnauthorizedError)
const apiErrorCode = computed(() => getHouseholdApiErrorCode(previewQuery.error.value))
const isMismatch = computed(() => apiErrorCode.value === 'HOUSEHOLD_INVITATION_EMAIL_MISMATCH')
const deadMessage = computed(() =>
  getHouseholdErrorMessage(previewQuery.error.value))

async function goHome(): Promise<void> {
  await router.push({ name: 'home' })
}
</script>

<template>
  <section class="mx-auto mt-10 max-w-sm">
    <h1 class="text-2xl font-semibold">{{ t('household.invite.title') }}</h1>

    <div
      v-if="isPending"
      class="mt-6 flex items-center justify-center gap-3 text-muted-foreground"
      data-testid="invite-page-loading"
    >
      <Spinner class="size-5" />
      <span class="text-sm">{{ t('boot.loading') }}</span>
    </div>

    <Card v-else-if="isAnonymous" class="mt-6" data-testid="invite-page-anonymous">
      <CardHeader>
        <CardTitle>{{ t('household.invite.anonymousTitle') }}</CardTitle>
      </CardHeader>
      <CardContent class="flex flex-col gap-3">
        <p class="text-sm text-muted-foreground">
          {{ t('household.invite.anonymousDescription') }}
        </p>
        <Button as-child data-testid="invite-page-login-link">
          <RouterLink :to="{ name: 'login', query: { redirect: invitePath } }">
            {{ t('auth.submitSignIn') }}
          </RouterLink>
        </Button>
        <Button as-child variant="secondary" data-testid="invite-page-register-link">
          <RouterLink :to="{ name: 'register', query: { redirect: invitePath } }">
            {{ t('auth.submitSignUp') }}
          </RouterLink>
        </Button>
      </CardContent>
    </Card>

    <Card v-else-if="isMismatch" class="mt-6" data-testid="invite-page-mismatch">
      <CardHeader>
        <CardTitle>{{ t('household.invite.mismatchTitle') }}</CardTitle>
      </CardHeader>
      <CardContent class="flex flex-col gap-3">
        <p class="text-sm text-muted-foreground">
          {{ t('household.invite.mismatchDescription') }}
        </p>
        <p v-if="auth.user?.email" class="text-sm">
          {{ t('auth.signedInAs') }}: {{ auth.user.email }}
        </p>
        <Button as-child variant="secondary">
          <RouterLink :to="{ name: 'home' }">{{ t('household.invite.backHome') }}</RouterLink>
        </Button>
      </CardContent>
    </Card>

    <Card v-else-if="deadMessage" class="mt-6" data-testid="invite-page-dead">
      <CardHeader>
        <CardTitle>{{ t('household.invite.deadTitle') }}</CardTitle>
      </CardHeader>
      <CardContent class="flex flex-col gap-3">
        <p class="text-sm text-muted-foreground">{{ deadMessage }}</p>
        <Button as-child variant="secondary">
          <RouterLink :to="{ name: 'home' }">{{ t('household.invite.backHome') }}</RouterLink>
        </Button>
      </CardContent>
    </Card>

    <ErrorState
      v-else-if="previewQuery.error.value"
      class="mt-6"
      @retry="previewQuery.refetch()"
    />

    <Card v-else-if="previewQuery.data.value" class="mt-6">
      <CardContent class="pt-6">
        <AcceptInvitationForm
          :token="token"
          :preview="previewQuery.data.value"
          @accepted="goHome()"
        />
      </CardContent>
    </Card>
  </section>
</template>
