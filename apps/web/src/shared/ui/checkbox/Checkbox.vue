<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

// Custom-drawn native checkbox (warm-minimal system): 16px flat square with
// a hairline border; when checked the border and the inner rounded dot take
// `currentColor`, so the parent tints it (teal for primary, a category's own
// color via style). The real input keeps native semantics for a11y.

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const modelValue = defineModel<boolean>({ default: false })
</script>

<template>
  <input
v-model="modelValue" type="checkbox" data-slot="checkbox" :class="cn(
    'relative size-4 shrink-0 cursor-pointer appearance-none rounded-[4px] border-[1.5px] border-border bg-transparent transition-[border-color,box-shadow] outline-none',
    'checked:border-current checked:before:absolute checked:before:left-1/2 checked:before:top-1/2 checked:before:size-2 checked:before:-translate-x-1/2 checked:before:-translate-y-1/2 checked:before:rounded-[2px] checked:before:bg-current',
    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    'disabled:cursor-not-allowed disabled:opacity-50',
    props.class,
  )">
</template>
