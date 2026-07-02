<script setup lang="ts">
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import AddAccountForm from '@/features/add-account/AddAccountForm.vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const dialogOpen = ref(false)
const handleSuccess = () => {
  toast.success(t('addAccount.success'))
  dialogOpen.value = false
}
const handleError = (error: unknown) => {
  toast.error(t('addAccount.error'))
  console.error('Error creating account:', error)
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
      <AddAccountForm @success="handleSuccess" @error="handleError" />
    </DialogContent>
  </Dialog>
</template>
