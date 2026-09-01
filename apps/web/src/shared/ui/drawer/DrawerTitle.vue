<script setup lang="ts">
import type { DrawerTitleProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DrawerTitle, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<DrawerTitleProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DrawerTitle
    data-slot="drawer-title"
    v-bind="forwardedProps"
    :class="cn('text-lg leading-none font-semibold', props.class)"
  >
    <slot />
  </DrawerTitle>
</template>
