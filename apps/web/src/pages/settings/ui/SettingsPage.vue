<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { AVAILABLE_CURRENCIES } from '@/shared/lib/money'
import { capitalizeFirstLetter } from '@/shared/lib/capitalize'
import { useSettingsStore } from '@/shared/store/use-settings-store'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { useAuthStore, sessionApi } from '@/entities/session'
import { householdDisplayName, useHousehold } from '@/entities/household'
import { JoinHouseholdDialog } from '../features/join-household'
import { LeaveHouseholdButton } from '../features/leave-household'
import { notification } from '@/shared/services/notification'
import type { Session } from '@/entities/session'

const { t, locale, availableLocales } = useI18n()
const settings = useSettingsStore()
const auth = useAuthStore()

const formatNumber = (
  locale: string,
  currency: string,
  currencyDisplay?: Intl.NumberFormatOptionsCurrencyDisplay,
) => {
  const symbol = new Intl.NumberFormat(locale, {
    style: 'currency',
    currencyDisplay,
    currency,
  })
    .formatToParts(1)
    .find((x) => x.type === 'currency')?.value

  return symbol ? symbol[0]?.toUpperCase() + symbol.slice(1) : symbol
}

const currencies = computed(() => {
  const displayNames = new Intl.DisplayNames(locale.value, { type: 'currency' })

  return AVAILABLE_CURRENCIES.map((value) => ({
    id: value,
    label: `${capitalizeFirstLetter(displayNames.of(value) ?? '')} ${value} (${formatNumber(locale.value, value)})`,
  }))
})

const locales = computed(() => {
  const displayNames = new Intl.DisplayNames(locale.value, { type: 'language' })

  return availableLocales.map((value) => ({
    id: value,
    label: capitalizeFirstLetter(displayNames.of(value) ?? ''),
  }))
})

// --- Session management ----------------------------------------------------
const sessions = ref<Session[]>([])
const sessionsLoading = ref(false)
const revoking = ref(false)

// --- Household (household-join) ---------------------------------------------
// Control-plane read over the API (not synced data): display name (owner
// email prefix fallback) + members count, with the join/leave entries.
const householdQuery = useHousehold({ enabled: () => auth.isAuthenticated })
const householdLabel = computed(() => {
  const household = householdQuery.data.value
  return household ? householdDisplayName(household) : null
})
const householdMembersCount = computed(() => householdQuery.data.value?.members.length ?? 0)

async function loadSessions() {
  sessionsLoading.value = true
  try {
    sessions.value = await sessionApi.listSessions()
  } catch (error) {
    notification.mutationError(error, { title: t('auth.sessionsTitle'), feature: 'session', action: 'list' })
  } finally {
    sessionsLoading.value = false
  }
}

async function revokeOtherSessions() {
  revoking.value = true
  try {
    await sessionApi.deleteAllSessions()
    notification.success(t('auth.sessionsRevoked'))
    await loadSessions()
  } catch (error) {
    notification.mutationError(error, { title: t('auth.revokeOtherSessions'), feature: 'session', action: 'revoke' })
  } finally {
    revoking.value = false
  }
}

const formatExpiry = (iso: string) =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  )

onMounted(() => {
  // Only fetch when actually signed in (keeps the unauthenticated test harness
  // from making network calls).
  if (auth.isAuthenticated) void loadSessions()
})
</script>

<template>
  <section class="flex flex-col gap-6">
    <h1 class="text-2xl font-semibold">{{ t('pages.settings') }}</h1>

    <label class="flex items-center gap-2">
      <p>{{ t('settings.currency') }}:</p>
      <Select v-model="settings.currency" class="w-full">
        <SelectTrigger>
          <SelectValue :placeholder="t('settings.currency')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="item in currencies" :key="item.id" :value="item.id">
            {{ item.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </label>

    <label class="flex items-center gap-2">
      <p>{{ t('settings.locale') }}:</p>
      <Select v-model="settings.locale" class="w-full">
        <SelectTrigger>
          <SelectValue :placeholder="t('settings.locale')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="item in locales" :key="item.id" :value="item.id">
            {{ item.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </label>

    <template v-if="auth.isAuthenticated">
      <Card v-if="!auth.user?.emailVerified">
        <CardHeader>
          <CardTitle>{{ t('auth.verifyEmailPrompt') }}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button as-child variant="outline">
            <RouterLink :to="{ name: 'verify-email' }">{{ t('auth.verifyEmailTitle') }}</RouterLink>
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="settings-household-card">
        <CardHeader>
          <CardTitle>{{ t('household.title') }}</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-3">
          <Skeleton v-if="householdQuery.isLoading.value" class="h-5 w-40" />
          <p v-else-if="householdLabel" class="text-sm" data-testid="settings-household-name">
            {{ householdLabel }} · {{ t('household.membersCount', householdMembersCount) }}
          </p>
          <div class="flex flex-wrap gap-2">
            <JoinHouseholdDialog />
            <LeaveHouseholdButton />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{{ t('auth.sessionsTitle') }}</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-3">
          <p class="text-sm text-muted-foreground">{{ t('auth.sessionsDescription') }}</p>
          <ul v-if="sessions.length" class="flex flex-col gap-2 text-sm">
            <li
              v-for="(session, index) in sessions"
              :key="index"
              class="flex items-center justify-between border-b border-b-muted pb-2 last:border-0"
            >
              <span>
                {{ t('auth.sessionExpiresAt') }}: {{ formatExpiry(session.expiresAt) }}
                <span v-if="session.isCurrent" class="ml-2 text-muted-foreground">
                  ({{ t('auth.sessionCurrent') }})
                </span>
              </span>
            </li>
          </ul>
          <p v-else-if="!sessionsLoading" class="text-sm text-muted-foreground">-</p>
          <div class="flex gap-2">
            <Button variant="outline" :loading="sessionsLoading" @click="loadSessions">
              {{ t('common.errorState.retry') }}
            </Button>
            <Button variant="outline" :loading="revoking" @click="revokeOtherSessions">
              {{ t('auth.revokeOtherSessions') }}
            </Button>
          </div>
        </CardContent>
      </Card>

      <RouterLink :to="{ name: 'reset-password' }" class="text-sm text-muted-foreground hover:underline">
        {{ t('auth.forgotPassword') }}
      </RouterLink>
    </template>
  </section>
</template>
