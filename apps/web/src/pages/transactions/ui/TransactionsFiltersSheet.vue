<script setup lang="ts">
import { Button } from '@/shared/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/shared/ui/drawer'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { ListFilterIcon } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import TransactionsFilters from './TransactionsFilters.vue'
import { ref } from 'vue'
import { useDesktopPresentation } from '@/shared/lib/presentation'

const { t } = useI18n()
const isDesktop = useDesktopPresentation()
const open = ref(false)

const handleSubmit = () => {
  open.value = false
}
</script>

<template>
  <Button variant="secondary" @click="open = true">
    <ListFilterIcon /> {{ t('transactions.filter') }}
  </Button>

  <Sheet v-if="isDesktop" v-model:open="open">
    <!-- Drawer specimen: bordered full-bleed header, scrolling filter body,
         footer pair pinned by the form itself. -->
    <SheetContent class="gap-0 p-0 sm:max-w-[400px]">
      <SheetHeader class="border-b border-border px-6 py-5">
        <SheetTitle>{{ t('transactions.filtersTitle') }}</SheetTitle>
      </SheetHeader>
      <TransactionsFilters class="min-h-0 flex-1" @submit="handleSubmit" />
    </SheetContent>
  </Sheet>

  <Drawer v-else v-model:open="open">
    <DrawerContent class="gap-0 p-0">
      <template #header>
        <DrawerHeader class="border-b border-border px-6 py-5">
          <DrawerTitle>{{ t('transactions.filtersTitle') }}</DrawerTitle>
        </DrawerHeader>
      </template>
      <TransactionsFilters class="min-h-0 flex-1" @submit="handleSubmit" />
    </DrawerContent>
  </Drawer>
</template>
