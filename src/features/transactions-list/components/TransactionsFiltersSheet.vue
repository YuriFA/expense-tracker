<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ListFilterIcon } from 'lucide-vue-next'
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
    <SheetContent>
      <SheetHeader>
        <SheetTitle>{{ t('transactions.filtersTitle') }}</SheetTitle>
      </SheetHeader>
      <div class="px-4">
        <TransactionsFilters @submit="handleSubmit" />
      </div>
    </SheetContent>
  </Sheet>
</template>
