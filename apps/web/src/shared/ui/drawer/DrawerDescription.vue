<script setup lang="ts">
import type { DrawerDescriptionProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DrawerDescription, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<DrawerDescriptionProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DrawerDescription
    data-slot="drawer-description"
    v-bind="forwardedProps"
    :class="cn('text-sm text-muted-foreground', props.class)"
  >
    <slot />
  </DrawerDescription>
</template>
