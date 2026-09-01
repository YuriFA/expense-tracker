<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="drawer-footer"
    :class="
      cn(
        'mt-auto flex flex-col-reverse gap-2 border-t px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
