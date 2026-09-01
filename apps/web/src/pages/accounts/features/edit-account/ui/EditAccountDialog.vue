<script setup lang="ts">
import { ResponsiveDialog } from '@/shared/ui/responsive-dialog'
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
  <ResponsiveDialog v-model:open="open">
    <template #title>{{ t('editAccount.title') }}</template>
    <EditAccountForm :account="account" @success="handleSuccess" />
  </ResponsiveDialog>
</template>
