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
import { useDeleteTransaction } from '@/entities/transaction'
import { notification } from '@/shared/services/notification'

const { transactionId } = defineProps<{
  transactionId: string
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { mutateAsync: deleteTransaction } = useDeleteTransaction()

const handleConfirm = async () => {
  try {
    await deleteTransaction(transactionId)
    notification.success(t('deleteTransaction.success'))
  } catch (error) {
    notification.mutationError(error, {
      title: t('deleteTransaction.error'),
      feature: 'transaction',
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
          {{ t('deleteTransaction.confirmDelete') }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{ t('deleteTransaction.confirmDeleteDescription') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('deleteTransaction.cancel') }}</AlertDialogCancel>
        <AlertDialogAction variant="destructive" @click="handleConfirm">
          {{ t('deleteTransaction.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
