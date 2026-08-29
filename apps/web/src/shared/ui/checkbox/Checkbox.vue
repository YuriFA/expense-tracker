<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

// Custom-drawn native checkbox (warm-minimal system), two variants per the
// design system:
// - `row` (default): 16px flat square with a hairline border; when checked
//   the border and the inner rounded dot take `currentColor`, so the parent
//   tints it (teal for primary, a category's own color via style).
// - `filter`: 20px, 2px border; when checked it fills teal and shows a white
//   check — the standalone filter-row control.
// The real input keeps native semantics for a11y.

const props = withDefaults(
  defineProps<{
    variant?: 'row' | 'filter'
    // eslint-disable-next-line vue/require-default-prop
    class?: HTMLAttributes['class']
  }>(),
  { variant: 'row' },
)

const modelValue = defineModel<boolean>({ default: false })
</script>

<template>
  <input
v-model="modelValue" type="checkbox" data-slot="checkbox" :data-variant="variant" :class="cn(
    'relative shrink-0 cursor-pointer appearance-none border-border bg-transparent transition-[border-color,box-shadow] outline-none',
    variant === 'row'
      ? cn(
          'size-4 rounded-[4px] border-[1.5px]',
          'checked:border-current checked:before:absolute checked:before:left-1/2 checked:before:top-1/2 checked:before:size-2 checked:before:-translate-x-1/2 checked:before:-translate-y-1/2 checked:before:rounded-[2px] checked:before:bg-current',
        )
      : cn(
          'size-5 rounded-[6px] border-2',
          'checked:border-primary checked:bg-primary checked:before:absolute checked:before:left-1/2 checked:before:top-1/2 checked:before:size-2.5 checked:before:-translate-x-1/2 checked:before:translate-y-[-55%] checked:before:rotate-45 checked:before:border-r-2 checked:before:border-b-2 checked:before:border-primary-foreground',
        ),
    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    'disabled:cursor-not-allowed disabled:opacity-50',
    props.class,
  )">
</template>
