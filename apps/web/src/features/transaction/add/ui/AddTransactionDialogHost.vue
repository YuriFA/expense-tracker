<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import AddTransactionTabs from './AddTransactionTabs.vue'
import { useAddTransactionDialog } from '../model/add-transaction-dialog'

// Single desktop creation-flow dialog (web-unified-transaction-entry): the
// shell mounts this host once; triggers open it through the controller.
const { t } = useI18n()
const { open, preselect, closeAddTransactionDialog } = useAddTransactionDialog()
</script>

<template>
  <Dialog :open="open" @update:open="(value: boolean) => !value && closeAddTransactionDialog()">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('addTransaction.newTransaction') }}</DialogTitle>
      </DialogHeader>
      <AddTransactionTabs :preselect="preselect" @success="closeAddTransactionDialog" />
    </DialogContent>
  </Dialog>
</template>
