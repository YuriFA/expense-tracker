<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { AddTransactionTabs } from '@/features/transaction/add'
import TransactionsBrowser from './TransactionsBrowser.vue'

const { t } = useI18n()
const dialogOpen = ref(false)

const handleSuccess = () => {
  dialogOpen.value = false
}
</script>

<template>
  <section>
    <div class="flex gap-4 justify-between items-center">
      <h1 class="text-2xl font-semibold">{{ t('pages.transactions') }}</h1>

      <Dialog v-model:open="dialogOpen">
        <DialogTrigger as-child>
          <Button>{{ t('actions.create') }}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{{ t('addTransaction.newTransaction') }}</DialogTitle>
          </DialogHeader>
          <AddTransactionTabs @success="handleSuccess" />
        </DialogContent>
      </Dialog>
    </div>

    <TransactionsBrowser class="mt-6" />
  </section>
</template>
