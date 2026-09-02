<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { useAddTransactionDialog } from '@/features/transaction/add'
import TransactionsBrowser from './TransactionsBrowser.vue'

// Contextual trigger of the single creation flow (web-unified-transaction-
// entry): the dialog lives in the app shell host, not on this page.
const { t } = useI18n()
const { openAddTransactionDialog } = useAddTransactionDialog()
</script>

<template>
  <section>
    <PageHeader :title="t('pages.transactions')">
      <template #actions>
        <Button data-testid="transactions-create" @click="openAddTransactionDialog()">
          {{ t('actions.create') }}
        </Button>
      </template>
    </PageHeader>

    <TransactionsBrowser class="mt-6" />
  </section>
</template>
