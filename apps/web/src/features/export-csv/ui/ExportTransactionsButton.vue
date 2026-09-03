<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { DownloadIcon } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { useAccounts } from '@/entities/account'
import { useCategoriesIncludingArchived } from '@/entities/category'
import type { Transaction } from '@/entities/transaction'
import { notification } from '@/shared/services/notification'
import { buildTransactionsCsv } from '../lib/build-transactions-csv'
import { downloadTextFile } from '../lib/download-text-file'

const props = defineProps<{
  /** Exactly the transactions to export — the caller decides the scope
   * (the transactions screen passes its filtered set, settings passes all). */
  transactions: Transaction[]
}>()

const { t } = useI18n()
const { data: accounts } = useAccounts()
// Including archived: rows of archived categories still export their names.
const { data: categories } = useCategoriesIncludingArchived()

const exportCsv = () => {
  const csv = buildTransactionsCsv(props.transactions, {
    accounts: accounts.value,
    categories: categories.value,
  })
  const today = new Date().toISOString().slice(0, 10)
  downloadTextFile(`transactions_${today}.csv`, csv)
  notification.success(t('dataTransfer.exportSuccess'))
}
</script>

<template>
  <Button
    variant="outline"
    :disabled="!props.transactions.length"
    data-testid="export-transactions"
    @click="exportCsv"
  >
    <DownloadIcon class="size-4" />
    {{ t('dataTransfer.exportButton') }}
  </Button>
</template>
