<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  icon: string
  color?: string
  class?: HTMLAttributes['class']
}>()

// Design system: "emoji glyph on a pastel tinted circle" - the tint comes
// from the category's own stored color; colorless data falls back to muted.
const background = computed(() =>
  props.color ? `color-mix(in srgb, ${props.color} 15%, transparent)` : undefined,
)
</script>

<template>
  <span
    :class="
      cn(
        'flex shrink-0 items-center justify-center rounded-full text-base',
        !color && 'bg-muted',
        props.class,
      )
    "
    :style="background ? { backgroundColor: background } : undefined"
    aria-hidden="true"
  >
    {{ icon }}
  </span>
</template>
