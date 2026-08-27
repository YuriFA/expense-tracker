<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CloudUploadIcon } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'
import { useAuthStore } from '@/entities/session'
import { useSyncController } from '@/shared/lib/local-db'
import { useSyncStatus } from '../model/use-sync-status'

// Sync status badge (design D7): surfaces the sync state - unresolved
// conflicts first, then the paused (auth expired) state, the in-flight
// cycle, the pending outbox count, and the settled "synced" state. Tapping
// opens the conflict center when conflicts exist, otherwise forces a manual
// run. Hidden entirely while anonymous: the app is fully usable offline and
// the badge only describes SERVER sync.

const { t } = useI18n()
const auth = useAuthStore()
const { engineState, runNow, conflictsOpen } = useSyncController()
const { data: status } = useSyncStatus()

const pending = computed(() => status.value?.pendingOperations ?? 0)
const conflicts = computed(() => status.value?.unresolvedConflicts ?? 0)

const view = computed(() => {
  if (conflicts.value > 0) {
    return {
      id: 'sync-status-conflicts',
      label: t('sync.status.conflicts', { count: conflicts.value }),
      destructive: true,
      showSpinner: false,
    }
  }
  if (engineState.value.paused) {
    return {
      id: 'sync-status-paused',
      label: t('sync.status.paused'),
      destructive: true,
      showSpinner: false,
    }
  }
  if (engineState.value.running) {
    return { id: 'sync-status-running', label: t('sync.status.running'), destructive: false, showSpinner: true }
  }
  if (pending.value > 0) {
    return {
      id: 'sync-status-pending',
      label: t('sync.status.pending', { count: pending.value }),
      destructive: false,
      showSpinner: false,
    }
  }
  return { id: 'sync-status-synced', label: t('sync.status.synced'), destructive: false, showSpinner: false }
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
    v-if="auth.isAuthenticated"
    variant="outline"
    size="sm"
    class="h-7 gap-1.5 rounded-full px-3 text-xs font-medium"
    :class="view.destructive ? 'text-destructive' : 'text-muted-foreground'"
    data-testid="sync-status-badge"
    @click="activate"
  >
    <Spinner v-if="view.showSpinner" class="size-3.5" />
    <CloudUploadIcon v-else class="size-3.5" :class="{ 'text-destructive': view.destructive }" />
    <span :data-testid="view.id">{{ view.label }}</span>
  </Button>
</template>
