<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LocalSyncConflict } from '@expense-tracker/local-data'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { useSyncController } from '@/shared/lib/local-db'
import { notification } from '@/shared/services/notification'
import {
  conflictSubject,
  useResolveConflict,
  useUnresolvedConflicts,
  type ConflictAction,
} from '../model/use-sync-conflicts'
import { canRestoreAsNew, useRestoreConflictAsNew } from '../model/restore-as-new'

// Global conflict center (design D7): lists unresolved sync conflicts from
// the persistent sync_conflicts table and resolves them in place -
// keep-local re-pushes on the server's current version, take-server applies
// the server state and drops pending operations (sync-protocol). Deleted-kind
// conflicts additionally offer restore-as-new: the preserved local state is
// re-created as a fresh record with a new id. Mounted once in the app shell;
// the sync badge opens it.

const { t } = useI18n()
const { conflictsOpen } = useSyncController()
const { data, status } = useUnresolvedConflicts()
const { mutateAsync: resolve, asyncStatus } = useResolveConflict()
const { mutateAsync: restoreAsNew, asyncStatus: restoreStatus } = useRestoreConflictAsNew()

const conflicts = computed(() => data.value ?? [])

// Literal keys per branch (the i18n lint bans dynamic keys); every synced
// entity kind now has a web surface.
function entityLabel(conflict: LocalSyncConflict): string {
  switch (conflict.entity) {
    case 'account':
      return t('sync.conflicts.entity.account')
    case 'category':
      return t('sync.conflicts.entity.category')
    case 'transaction':
      return t('sync.conflicts.entity.transaction')
    case 'debtor':
      return t('sync.conflicts.entity.debtor')
    case 'debt_operation':
      return t('sync.conflicts.entity.debt_operation')
    case 'planned_payment':
      return t('sync.conflicts.entity.planned_payment')
    default:
      return t('sync.conflicts.entity.other')
  }
}

function conflictMessage(conflict: LocalSyncConflict): string {
  const params = { entity: entityLabel(conflict), subject: conflictSubject(conflict) }
  if (conflict.kind !== 'deleted') {
    return t('sync.conflicts.versionChanged', params)
  }
  // Direction of the delete-vs-edit conflict: a live serverState means the
  // record was deleted HERE and edited elsewhere (delete-wins re-pushes the
  // tombstone); a tombstoned serverState means it was deleted elsewhere.
  return conflict.serverState?.deleted === false
    ? t('sync.conflicts.deletedLocally', params)
    : t('sync.conflicts.deletedRemotely', params)
}

async function handleResolve(action: ConflictAction, conflict: LocalSyncConflict) {
  try {
    await resolve({ action, conflictId: conflict.id })
  } catch (error) {
    notification.mutationError(error, {
      title: t('sync.conflicts.resolveError'),
      feature: 'sync',
      action,
    })
  }
}

async function handleRestore(conflict: LocalSyncConflict) {
  try {
    await restoreAsNew(conflict)
    notification.success(t('sync.conflicts.restoreSuccess'))
  } catch (error) {
    notification.mutationError(error, {
      title: canRestoreAsNew(conflict)
        ? t('sync.conflicts.restoreError')
        : t('sync.conflicts.restoreUnavailable'),
      feature: 'sync',
      action: 'restore',
    })
  }
}
</script>

<template>
  <Dialog v-model:open="conflictsOpen">
    <DialogContent data-testid="conflict-center" class="max-h-[80vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ t('sync.conflicts.title') }}</DialogTitle>
        <DialogDescription>{{ t('sync.conflicts.description') }}</DialogDescription>
      </DialogHeader>

      <p v-if="status === 'pending'" class="py-6 text-center text-sm text-muted-foreground">
        {{ t('boot.loading') }}
      </p>
      <p
        v-else-if="conflicts.length === 0"
        class="py-6 text-center text-sm text-muted-foreground"
        data-testid="conflict-center-empty"
      >
        {{ t('sync.conflicts.empty') }}
      </p>

      <ul v-else class="flex flex-col gap-4">
        <li
          v-for="conflict in conflicts"
          :key="conflict.id"
          class="rounded-lg border p-4"
          :data-testid="`conflict-item-${conflict.id}`"
        >
          <p class="text-sm">
            {{ conflictMessage(conflict) }}
          </p>
          <div v-if="conflict.kind === 'version'" class="mt-3 flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              :disabled="asyncStatus === 'loading'"
              @click="handleResolve('keep-local', conflict)"
            >
              {{ t('sync.conflicts.keepLocal') }}
            </Button>
            <Button
              size="sm"
              :disabled="asyncStatus === 'loading'"
              @click="handleResolve('take-server', conflict)"
            >
              {{ t('sync.conflicts.takeServer') }}
            </Button>
          </div>
          <div v-else class="mt-3 flex flex-wrap justify-end gap-2">
            <Button
              v-if="canRestoreAsNew(conflict)"
              size="sm"
              variant="outline"
              :disabled="asyncStatus === 'loading' || restoreStatus === 'loading'"
              data-testid="conflict-restore-as-new"
              @click="handleRestore(conflict)"
            >
              {{ t('sync.conflicts.restoreAsNew') }}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              :disabled="asyncStatus === 'loading' || restoreStatus === 'loading'"
              @click="handleResolve('dismiss', conflict)"
            >
              {{ t('sync.conflicts.dismiss') }}
            </Button>
          </div>
        </li>
      </ul>
    </DialogContent>
  </Dialog>
</template>
