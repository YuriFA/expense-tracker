<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { useI18n } from 'vue-i18n'
import EditAccountForm from './EditAccountForm.vue'
import type { Account } from '@/entities/account'

const open = defineModel<boolean>('open', { default: false })
const { account } = defineProps<{
  account: Account
}>()

const { t } = useI18n()

const handleSuccess = () => {
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t('editAccount.title') }}</DialogTitle>
      </DialogHeader>
      <EditAccountForm :account="account" @success="handleSuccess" />
    </DialogContent>
  </Dialog>
</template>
