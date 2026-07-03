<script setup lang="ts">
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import AddAccountForm from '@/features/add-account/AddAccountForm.vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const dialogOpen = ref(false)
const handleSuccess = () => {
  dialogOpen.value = false
}
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogTrigger as-child>
      <slot name="trigger">
        <Button class="max-sm:w-full">{{ t('actions.create') }}</Button>
      </slot>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t('addAccount.newAccount') }}</DialogTitle>
      </DialogHeader>
      <AddAccountForm @success="handleSuccess" />
    </DialogContent>
  </Dialog>
</template>
