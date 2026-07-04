<script setup lang="ts">
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
import { useI18n } from 'vue-i18n'
import { useDeleteAccount } from '@/entities/account'
import { notification } from '@/shared/api/notification'

const { accountId } = defineProps<{
  accountId: string
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { mutateAsync: deleteAccount } = useDeleteAccount()

const handleConfirm = async () => {
  try {
    await deleteAccount(accountId)
    notification.success(t('deleteAccount.success'))
  } catch (error) {
    notification.mutationError(error, {
      title: t('deleteAccount.error'),
      feature: 'account',
      action: 'delete',
    })
  } finally {
    open.value = false
  }
}
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{ t('deleteAccount.confirmDelete') }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{ t('deleteAccount.confirmDeleteDescription') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('deleteAccount.cancel') }}</AlertDialogCancel>
        <AlertDialogAction variant="destructive" @click="handleConfirm">
          {{ t('deleteAccount.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
