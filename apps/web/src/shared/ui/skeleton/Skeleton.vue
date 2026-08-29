<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <!-- Specimen: hairline sweep shimmer (paper system), not a pulse. -->
  <div
    data-slot="skeleton"
    :class="cn('skeleton-shimmer rounded-md', props.class)"
  />
</template>

<style scoped>
.skeleton-shimmer {
  background: linear-gradient(90deg, var(--border) 25%, var(--background) 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>
