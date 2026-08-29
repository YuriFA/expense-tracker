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
import { Trash2Icon } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useDeleteAccount } from '@/entities/account'
import { notification } from '@/shared/services/notification'

const { accountId } = defineProps<{
  accountId: string
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { mutateAsync: deleteAccount, asyncStatus } = useDeleteAccount()

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
        <AlertDialogTitle>
          {{ t('deleteAccount.confirmDelete') }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{ t('deleteAccount.confirmDeleteDescription') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter class="flex-col-reverse gap-3 sm:flex-row">
        <AlertDialogCancel class="w-full sm:flex-1" data-testid="delete-account-cancel">
          {{ t('deleteAccount.cancel') }}
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          class="w-full sm:flex-1"
          :loading="asyncStatus === 'loading'"
          data-testid="delete-account-confirm"
          @click="handleConfirm"
        >
          {{ t('deleteAccount.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
