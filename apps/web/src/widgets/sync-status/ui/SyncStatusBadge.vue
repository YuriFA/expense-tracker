<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CloudAlertIcon, CloudUploadIcon, PauseIcon } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'
import { useAuthStore } from '@/entities/session'
import { useSyncController } from '@/shared/lib/local-db'
import { useSyncStatus } from '../model/use-sync-status'

// Sync status badge (design D7): surfaces the sync state - unresolved
// conflicts first, then operations the server keeps rejecting, the paused
// (auth expired) state, the in-flight cycle, the pending outbox count, and
// the settled "synced" state. Tapping opens the conflict center when
// conflicts exist, otherwise forces a manual run. Hidden entirely while
// anonymous: the app is fully usable offline and the badge only describes
// SERVER sync.

// The compact variant (<1024px top bar, paper redesign) drops the label:
// a 28px icon-only control whose state reads from the icon and tint, with
// the pending count as a corner badge and the full label kept for a11y.
const { compact = false } = defineProps<{
  compact?: boolean
}>()

const { t } = useI18n()
const auth = useAuthStore()
const { engineState, runNow, conflictsOpen } = useSyncController()
const { data: status } = useSyncStatus()

const pending = computed(() => status.value?.pendingOperations ?? 0)
// Failing = the server (or local wire validation) rejected the operation's
// last attempt: waiting will not clear it, so it must not read as plain
// "waiting to send". A subset of `pending`.
const failing = computed(() => status.value?.failingOperations ?? 0)
const lastError = computed(() => status.value?.lastError ?? null)
const conflicts = computed(() => status.value?.unresolvedConflicts ?? 0)

const view = computed(() => {
  if (conflicts.value > 0) {
    return {
      id: 'sync-status-conflicts',
      label: t('sync.status.conflicts', { count: conflicts.value }),
      destructive: true,
      // Specimen: the conflict pill carries the terracotta wash, unlike the
      // plain outlined paused pill.
      tinted: true,
      showSpinner: false,
    }
  }
  if (failing.value > 0) {
    return {
      id: 'sync-status-failing',
      label: t('sync.status.failing', { count: failing.value }),
      destructive: true,
      // Same terracotta wash as conflicts: a state the user must act on,
      // unlike plain pending.
      tinted: true,
      showSpinner: false,
    }
  }
  if (engineState.value.paused) {
    return {
      id: 'sync-status-paused',
      label: t('sync.status.paused'),
      destructive: true,
      tinted: false,
      showSpinner: false,
    }
  }
  if (engineState.value.running) {
    return {
      id: 'sync-status-running',
      label: t('sync.status.running'),
      destructive: false,
      tinted: false,
      showSpinner: true,
    }
  }
  if (pending.value > 0) {
    return {
      id: 'sync-status-pending',
      label: t('sync.status.pending', { count: pending.value }),
      destructive: false,
      tinted: false,
      showSpinner: false,
    }
  }
  return {
    id: 'sync-status-synced',
    label: t('sync.status.synced'),
    destructive: false,
    tinted: false,
    showSpinner: false,
  }
})

// Compact tint/icon mapping: conflicts and failing ops get the destructive
// wash (like the full pill's tinted state), paused keeps an outlined circle
// with a destructive glyph, the running spinner takes the teal accent.
const compactClasses = computed(() => {
  if (view.value.id === 'sync-status-conflicts' || view.value.id === 'sync-status-failing') {
    return 'border-transparent bg-destructive/10 text-destructive'
  }
  if (view.value.destructive) return 'text-destructive'
  if (view.value.showSpinner) return 'text-primary'
  return 'text-muted-foreground'
})

function activate() {
  if (conflicts.value > 0) {
    conflictsOpen.value = true
    return
  }
  if (!engineState.value.paused) runNow(true)
}
</script>

<template>
  <Button
    v-if="auth.isAuthenticated && !compact"
    variant="outline"
    size="sm"
    class="h-7 gap-1.5 rounded-full px-3 text-xs font-medium"
    :class="
      view.tinted
        ? 'border-transparent bg-warning/10 font-semibold text-destructive'
        : view.destructive
          ? 'text-destructive'
          : 'text-muted-foreground'
    "
    :title="view.id === 'sync-status-failing' ? (lastError ?? undefined) : undefined"
    data-testid="sync-status-badge"
    @click="activate"
  >
    <Spinner v-if="view.showSpinner" class="size-3.5" />
    <CloudUploadIcon v-else class="size-3.5" :class="{ 'text-destructive': view.destructive }" />
    <span :data-testid="view.id">{{ view.label }}</span>
  </Button>

  <Button
    v-else-if="auth.isAuthenticated"
    variant="outline"
    class="relative size-7 rounded-full p-0"
    :class="compactClasses"
    :aria-label="view.label"
    :title="view.id === 'sync-status-failing' ? (lastError ?? view.label) : view.label"
    data-testid="sync-status-badge"
    @click="activate"
  >
    <Spinner v-if="view.showSpinner" class="size-3.5" />
    <PauseIcon v-else-if="view.id === 'sync-status-paused'" class="size-3.5" />
    <CloudAlertIcon
      v-else-if="view.id === 'sync-status-conflicts' || view.id === 'sync-status-failing'"
      class="size-3.5"
    />
    <CloudUploadIcon v-else class="size-3.5" />
    <span
      v-if="(view.id === 'sync-status-pending' || view.id === 'sync-status-failing') && pending > 0"
      class="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-warning px-0.5 text-[8px] font-bold leading-none text-warning-foreground"
      >{{ failing > 0 ? failing : pending }}</span
    >
    <span class="sr-only" :data-testid="view.id">{{ view.label }}</span>
  </Button>
</template>
