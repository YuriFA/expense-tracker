<script setup lang="ts">
import { ResponsiveDialog } from '@/shared/ui/responsive-dialog'
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
  <ResponsiveDialog v-model:open="open">
    <template #title>{{ t('reconcileAccount.title', { name: account.name }) }}</template>
    <ReconcileAccountForm :account @success="handleSuccess" />
  </ResponsiveDialog>
</template>
