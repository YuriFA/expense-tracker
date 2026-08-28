<script setup lang="ts">
import { AlertCircleIcon } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { useI18n } from 'vue-i18n'

defineProps<{
  title?: string
  description?: string
}>()

defineEmits<{
  retry: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center gap-3 py-8 text-center">
    <AlertCircleIcon class="size-8 text-destructive" />
    <div class="space-y-1">
      <p class="text-sm font-medium">{{ title ?? t('common.errorState.title') }}</p>
      <p v-if="description" class="text-xs text-muted-foreground">{{ description }}</p>
    </div>
    <Button variant="outline" size="sm" @click="$emit('retry')">
      {{ t('common.errorState.retry') }}
    </Button>
  </div>
</template>
