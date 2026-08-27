<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { useAuthStore } from '../model/use-auth-store'

// The ownership gate's decision dialog (design D5): a different account
// signed in over local data owned by someone else. Mounted globally in the
// app shell; opens whenever the auth store parks a pending gate.
const { t } = useI18n()
const auth = useAuthStore()
const { pendingGate } = storeToRefs(auth)
</script>

<template>
  <AlertDialog :open="pendingGate !== null">
    <AlertDialogContent data-testid="ownership-gate-dialog">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('auth.ownershipGate.title') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ t('auth.ownershipGate.description') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel data-testid="ownership-gate-cancel" @click="auth.cancelOwnershipGate()">
          {{ t('auth.ownershipGate.cancel') }}
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          data-testid="ownership-gate-delete"
          @click="auth.confirmOwnershipGateDelete()"
        >
          {{ t('auth.ownershipGate.delete') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
