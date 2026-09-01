<script setup lang="ts">
import type { DrawerOverlayProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DrawerOverlay, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<DrawerOverlayProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DrawerOverlay
    data-slot="drawer-overlay"
    v-bind="forwardedProps"
    :class="
      cn(
        'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        props.class,
      )
    "
  >
    <slot />
  </DrawerOverlay>
</template>
