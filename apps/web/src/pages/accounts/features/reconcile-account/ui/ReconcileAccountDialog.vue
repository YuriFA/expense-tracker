<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { useI18n } from 'vue-i18n'
import type { AccountWithBalance } from '@/entities/account'
import ReconcileAccountForm from './ReconcileAccountForm.vue'

const open = defineModel<boolean>('open', { default: false })
const { account } = defineProps<{
  account: AccountWithBalance
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
        <DialogTitle>{{ t('reconcileAccount.title', { name: account.name }) }}</DialogTitle>
      </DialogHeader>
      <ReconcileAccountForm :account @success="handleSuccess" />
    </DialogContent>
  </Dialog>
</template>
