<script setup lang="ts">
import type { DrawerHandleProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DrawerHandle, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<DrawerHandleProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DrawerHandle
    data-slot="drawer-handle"
    v-bind="forwardedProps"
    :class="cn('mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/25', props.class)"
  />
</template>
