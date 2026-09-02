<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'
import { DRAWER_HEADER_PADDING } from './styles'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div data-slot="drawer-header" :class="cn('flex flex-col gap-2', DRAWER_HEADER_PADDING, 'text-left', props.class)">
    <slot />
  </div>
</template>
