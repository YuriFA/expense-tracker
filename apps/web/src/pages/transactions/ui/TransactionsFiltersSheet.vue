<script setup lang="ts">
import { Button } from '@/shared/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/ui/sheet'
import { ListFilterIcon } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import TransactionsFilters from './TransactionsFilters.vue'
import { ref } from 'vue'

const { t } = useI18n()
const open = ref(false)

const handleSubmit = () => {
  open.value = false
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetTrigger as-child>
      <Button variant="outline"><ListFilterIcon /> {{ t('transactions.filter') }}</Button>
    </SheetTrigger>
    <!-- Drawer specimen: bordered full-bleed header, scrolling filter body,
         footer pair pinned by the form itself. -->
    <SheetContent class="gap-0 p-0 sm:max-w-[400px]">
      <SheetHeader class="border-b border-border px-6 py-5">
        <SheetTitle>{{ t('transactions.filtersTitle') }}</SheetTitle>
      </SheetHeader>
      <TransactionsFilters class="min-h-0 flex-1" @submit="handleSubmit" />
    </SheetContent>
  </Sheet>
</template>
