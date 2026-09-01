<script setup lang="ts">
import { Button } from '@/shared/ui/button'
import { ResponsiveDialog } from '@/shared/ui/responsive-dialog'
import AddAccountForm from './AddAccountForm.vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const dialogOpen = ref(false)
const handleSuccess = () => {
  dialogOpen.value = false
}
</script>

<template>
  <div @click="dialogOpen = true">
    <slot name="trigger">
      <Button class="max-sm:w-full">{{ t('actions.create') }}</Button>
    </slot>
  </div>

  <ResponsiveDialog v-model:open="dialogOpen">
    <template #title>{{ t('addAccount.newAccount') }}</template>
    <AddAccountForm @success="handleSuccess" />
  </ResponsiveDialog>
</template>
