<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { useHouseholdJoinStore } from '../model/use-household-join'

// The household-change choice dialog (household-join design D6/D7): the
// device's household changed (join-by-code, leave, or a stale second device),
// and local data must be rebased (carried) or wiped before syncing as the new
// household. Mounted globally in the app shell; opens whenever the join store
// parks a pending choice. Non-dismissable by design - the membership already
// changed server-side, so there is no "cancel" outcome.
const { t } = useI18n()
const join = useHouseholdJoinStore()
const { pending, applying } = storeToRefs(join)
</script>

<template>
  <Dialog :open="pending !== null">
    <DialogContent
      data-testid="household-choice-dialog"
      :show-close-button="false"
      @interact-outside.prevent
      @escape-key-down.prevent
    >
      <DialogHeader>
        <DialogTitle>{{ t('household.choice.title') }}</DialogTitle>
        <DialogDescription>
          {{ t('household.choice.description') }}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="flex-col gap-2 sm:flex-col">
        <Button
          data-testid="household-choice-carry"
          class="w-full"
          :loading="applying"
          @click="join.confirmChoice('carry')"
        >
          {{ t('household.choice.carry') }}
        </Button>
        <Button
          data-testid="household-choice-clean"
          variant="destructive"
          class="w-full"
          :disabled="applying"
          @click="join.confirmChoice('clean')"
        >
          {{ t('household.choice.clean') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
