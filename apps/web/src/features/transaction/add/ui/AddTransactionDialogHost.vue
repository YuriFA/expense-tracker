<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ResponsiveDialog } from '@/shared/ui/responsive-dialog'
import AddTransactionTabs from './AddTransactionTabs.vue'
import { useAddTransactionDialog } from '../model/add-transaction-dialog'

// Single desktop creation-flow dialog (web-unified-transaction-entry): the
// shell mounts this host once; triggers open it through the controller.
const { t } = useI18n()
const { open, preselect, closeAddTransactionDialog } = useAddTransactionDialog()
</script>

<template>
  <ResponsiveDialog
    :open="open"
    class="sm:max-w-md"
    @update:open="(value: boolean) => !value && closeAddTransactionDialog()"
  >
    <template #title>{{ t('addTransaction.newTransaction') }}</template>
    <AddTransactionTabs :preselect="preselect" @success="closeAddTransactionDialog" />
  </ResponsiveDialog>
</template>
