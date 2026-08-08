<script setup lang="ts">
import { InboxIcon } from '@lucide/vue'

defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
    <slot name="icon">
      <InboxIcon class="size-8" />
    </slot>
    <p class="text-sm font-medium">{{ title }}</p>
    <p v-if="description" class="text-xs">{{ description }}</p>
    <slot />
  </div>
</template>
