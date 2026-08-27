<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'
import { getHouseholdErrorMessage, householdApi } from '@/entities/household'
import { useHouseholdJoinStore } from '@/features/household-join'
import { notification } from '@/shared/services/notification'

// Leave flow (household-join): a destructive confirm, then the same shared
// carry/clean choice for the fresh personal household the backend created,
// then home. HOUSEHOLD_OWNER_WITH_MEMBERS (owner cannot abandon members)
// surfaces its own localized message.
const { t } = useI18n()
const router = useRouter()
const join = useHouseholdJoinStore()

const open = ref(false)
const leaving = ref(false)

async function handleConfirm(): Promise<void> {
  leaving.value = true
  try {
    const household = await householdApi.leave()
    notification.success(t('household.leaveSuccess'))
    open.value = false
    await join.chooseHouseholdData(household)
    await router.push({ name: 'home' })
  } catch (error) {
    const mapped = getHouseholdErrorMessage(error)
    if (mapped) {
      notification.error(mapped, { feature: 'household', action: 'leave' })
    } else {
      notification.mutationError(error, {
        title: t('household.leave'),
        feature: 'household',
        action: 'leave',
      })
    }
  } finally {
    leaving.value = false
  }
}
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogTrigger as-child>
      <Button variant="destructive" data-testid="household-leave-button">
        {{ t('household.leave') }}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('household.leaveTitle') }}</AlertDialogTitle>
        <AlertDialogDescription>{{ t('household.leaveDescription') }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel data-testid="household-leave-cancel">
          {{ t('household.cancel') }}
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          data-testid="household-leave-confirm"
          :loading="leaving"
          @click="handleConfirm"
        >
          {{ t('household.leave') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
