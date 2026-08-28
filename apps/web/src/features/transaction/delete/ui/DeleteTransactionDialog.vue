<script setup lang="ts">
import { Trash2Icon } from '@lucide/vue'
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
const { mutateAsync: deleteTransaction, asyncStatus } = useDeleteTransaction()

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
    <!-- Centered confirm (design system): icon circle, question, one-line
         description, flex-1 cancel/delete pair. -->
    <AlertDialogContent class="max-w-[320px]">
      <AlertDialogHeader class="items-center text-center sm:text-center">
        <span
          class="mx-auto mb-1 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
          aria-hidden="true"
        >
          <Trash2Icon class="size-6" />
        </span>
        <AlertDialogTitle>{{ t('deleteTransaction.confirmDelete') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ t('deleteTransaction.confirmDeleteDescription') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter class="flex-col-reverse gap-3 sm:flex-row">
        <AlertDialogCancel class="w-full sm:flex-1" data-testid="delete-transaction-cancel">
          {{ t('deleteTransaction.cancel') }}
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          class="w-full sm:flex-1"
          :loading="asyncStatus === 'loading'"
          data-testid="delete-transaction-confirm"
          @click="handleConfirm"
        >
          {{ t('deleteTransaction.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
