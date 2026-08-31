<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/shared/ui/button'
import { useAddTransactionDialog } from '@/features/transaction/add'
import TransactionsBrowser from './TransactionsBrowser.vue'

// Contextual trigger of the single creation flow (web-unified-transaction-
// entry): the dialog lives in the app shell host, not on this page.
const { t } = useI18n()
const { openAddTransactionDialog } = useAddTransactionDialog()
</script>

<template>
  <section>
    <div class="flex gap-4 justify-between items-center">
      <h1 class="text-[32px] font-bold tracking-tight">{{ t('pages.transactions') }}</h1>

      <Button data-testid="transactions-create" @click="openAddTransactionDialog()">
        {{ t('actions.create') }}
      </Button>
    </div>

    <TransactionsBrowser class="mt-6" />
  </section>
</template>
