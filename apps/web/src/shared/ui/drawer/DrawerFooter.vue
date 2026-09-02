<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'
import { DRAWER_FOOTER_CLASS } from './styles'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div data-slot="drawer-footer" :class="cn('mt-auto flex flex-col-reverse gap-2', DRAWER_FOOTER_CLASS, props.class)">
    <slot />
  </div>
</template>
