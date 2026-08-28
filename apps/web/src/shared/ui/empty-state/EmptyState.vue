<script setup lang="ts">
import { InboxIcon } from '@lucide/vue'

defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <!-- Specimen: dashed paper container, icon on a muted circle -->
  <div
    class="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-background/30 px-6 py-8 text-center text-muted-foreground"
  >
    <slot name="icon">
      <span class="flex size-12 items-center justify-center rounded-full bg-muted">
        <InboxIcon class="size-6" />
      </span>
    </slot>
    <p class="text-sm font-medium">{{ title }}</p>
    <p v-if="description" class="text-xs">{{ description }}</p>
    <slot />
  </div>
</template>
