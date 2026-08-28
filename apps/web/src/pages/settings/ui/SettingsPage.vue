<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { capitalizeFirstLetter } from '@/shared/lib/capitalize'
import { useSettingsStore } from '@/shared/store/use-settings-store'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { useAuthStore, sessionApi } from '@/entities/session'
import { householdDisplayName, memberLabel, useHousehold } from '@/entities/household'
import { DissolveHouseholdDialog } from '../features/dissolve-household'
import { DisplayNameEditor } from '../features/display-name'
import { HouseholdCodeDialog } from '../features/household-code'
import { HouseholdInvitationsDialog } from '../features/household-invitations'
import { InviteMemberDialog } from '../features/invite-member'
import { JoinHouseholdDialog } from '../features/join-household'
import { LeaveHouseholdButton } from '../features/leave-household'
import { RemoveMemberDialog } from '../features/remove-member'
import { RenameHouseholdDialog } from '../features/rename-household'
import { notification } from '@/shared/services/notification'
import type { Session } from '@/entities/session'
import type { HouseholdMember } from '@expense-tracker/api'

const { t, locale, availableLocales } = useI18n()
const settings = useSettingsStore()
const auth = useAuthStore()

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

// --- Household (household-ux 3.1) -------------------------------------------
// Control-plane read over the API (not synced data): display name (owner
// email prefix fallback), the member list (label/email, role, joined date),
// and role-aware actions. Owner-only actions are hidden, not disabled; the
// owner cannot leave while other members remain (the backend rejects it).
const householdQuery = useHousehold({ enabled: () => auth.isAuthenticated })
const household = computed(() => householdQuery.data.value)
const householdLabel = computed(() =>
  household.value ? householdDisplayName(household.value) : null,
)
const members = computed(() => household.value?.members ?? [])
const myMember = computed(
  () => household.value?.members.find((member) => member.userId === auth.user?.id) ?? null,
)
const isOwner = computed(() => myMember.value?.role === 'owner')
const canLeave = computed(() => !isOwner.value || members.value.length === 1)

// One remove dialog outside the members loop + the active member ref
// (vue-patterns §4).
const removeTarget = ref<HouseholdMember | null>(null)
const removeOpen = ref(false)

const joinedFormatter = computed(
  () => new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }),
)
const formatJoined = (iso: string) => joinedFormatter.value.format(new Date(iso))

const myDisplayName = computed(() => myMember.value?.displayName ?? '')

// The label resolves in script over static keys - the strict i18n lint
// bans computed keys inside templates.
const roleLabel = (role: HouseholdMember['role']): string =>
  role === 'owner' ? t('household.role.owner') : t('household.role.member')

function openRemove(member: HouseholdMember): void {
  removeTarget.value = member
  removeOpen.value = true
}

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
    <h1 class="text-3xl font-bold">{{ t('pages.settings') }}</h1>

    <Card>
      <CardHeader>
        <CardTitle>{{ t('settings.locale') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <label class="flex items-center gap-2">
          <span class="sr-only">{{ t('settings.locale') }}</span>
          <Select v-model="settings.locale" class="w-full sm:w-64">
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
      </CardContent>
    </Card>

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

      <!-- Mounts only once the household read resolves: the editor's initial
           form value comes from the member entry and would otherwise seed
           empty while the query is in flight. -->
      <DisplayNameEditor
        v-if="auth.user && household"
        :email="auth.user.email"
        :initial-name="myDisplayName"
      />

      <Card data-testid="settings-household-card">
        <CardHeader>
          <CardTitle>{{ t('household.title') }}</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-3">
          <Skeleton v-if="householdQuery.isLoading.value" class="h-5 w-40" />
          <p v-else-if="householdLabel" class="text-sm" data-testid="settings-household-name">
            {{ householdLabel }} · {{ t('household.membersCount', members.length) }}
          </p>

          <ul
            v-if="household"
            class="flex flex-col gap-2 text-sm"
            data-testid="settings-household-member-list"
          >
            <li
              v-for="member in members"
              :key="member.userId"
              class="flex items-center gap-2 border-b border-b-muted pb-2 last:border-0 last:pb-0"
              :data-testid="`settings-household-member-${member.userId}`"
            >
              <span class="flex-1">
                {{ memberLabel(member) }}
                <span v-if="member.userId === auth.user?.id" class="text-muted-foreground">
                  ({{ t('household.you') }})
                </span>
                <span class="block text-xs text-muted-foreground">
                  {{ member.email }} · {{ t('household.joinedAt', { date: formatJoined(member.joinedAt) }) }}
                </span>
              </span>
              <Badge variant="outline">
                {{ roleLabel(member.role) }}
              </Badge>
              <Button
                v-if="isOwner && member.role !== 'owner'"
                variant="ghost"
                size="sm"
                :data-testid="`settings-household-remove-${member.userId}`"
                @click="openRemove(member)"
              >
                {{ t('household.removeMember') }}
              </Button>
            </li>
          </ul>

          <div v-if="isOwner && household" class="flex flex-wrap gap-2" data-testid="settings-household-owner-actions">
            <InviteMemberDialog />
            <HouseholdInvitationsDialog />
            <HouseholdCodeDialog />
            <RenameHouseholdDialog :initial-name="household.name" />
            <DissolveHouseholdDialog />
          </div>

          <div class="flex flex-wrap gap-2">
            <JoinHouseholdDialog />
            <LeaveHouseholdButton v-if="canLeave" />
          </div>
        </CardContent>
      </Card>

      <RemoveMemberDialog v-model="removeOpen" :member="removeTarget" />

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
