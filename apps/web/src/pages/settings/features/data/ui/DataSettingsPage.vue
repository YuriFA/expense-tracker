<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { DownloadIcon, FileUpIcon } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { SettingsCard } from '@/shared/ui/settings-card'
import { useTransactions } from '@/entities/transaction'
import { ExportTransactionsButton } from '@/features/export-csv'
import ImportCsvDialog from './ImportCsvDialog.vue'

// Data screen (web-data-transfer): full CSV export and the CSV import wizard.
// Local-first: both work anonymously; imported rows sync after login.
const { t } = useI18n()
const { data } = useTransactions({})
const allTransactions = computed(() => data.value ?? [])

const importOpen = ref(false)
</script>

<template>
  <section>
    <PageHeader :title="t('dataTransfer.title')" />

    <div class="mt-6 flex flex-col gap-4">
      <SettingsCard :title="t('dataTransfer.exportTitle')">
        <div class="flex flex-col gap-3">
          <p class="text-sm text-muted-foreground">{{ t('dataTransfer.exportDescription') }}</p>
          <div>
            <ExportTransactionsButton :transactions="allTransactions" />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard :title="t('dataTransfer.importTitle')">
        <div class="flex flex-col gap-3">
          <p class="text-sm text-muted-foreground">{{ t('dataTransfer.importDescription') }}</p>
          <div>
            <Button data-testid="open-import-dialog" @click="importOpen = true">
              <FileUpIcon class="size-4" />
              {{ t('dataTransfer.importButton') }}
            </Button>
          </div>
          <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DownloadIcon class="size-3.5" />
            {{ t('dataTransfer.templateHint') }}
          </p>
        </div>
      </SettingsCard>
    </div>

    <ImportCsvDialog v-model:open="importOpen" />
  </section>
</template>
