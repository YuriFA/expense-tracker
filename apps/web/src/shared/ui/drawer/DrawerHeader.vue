<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div data-slot="drawer-header" :class="cn('flex flex-col gap-2 px-6 pb-4 pt-2 text-left', props.class)">
    <slot />
  </div>
</template>
