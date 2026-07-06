<script setup lang="ts">
import type { AlertDialogActionProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { AlertDialogAction } from 'reka-ui'
import { cn } from '@/shared/lib/utils'
import { buttonVariants, type ButtonVariants } from '@/shared/ui/button'
import { Spinner } from '../spinner'

const props = defineProps<
  AlertDialogActionProps & {
    class?: HTMLAttributes['class']
    variant: ButtonVariants['variant']
    size?: ButtonVariants['size']
    loading?: boolean
  }
>()

const delegatedProps = reactiveOmit(props, 'class', 'variant', 'size', 'loading')
</script>

<template>
  <AlertDialogAction
    v-bind="delegatedProps"
    :class="cn(buttonVariants({ variant: props.variant, size: props.size }), props.class)"
  >
    <Spinner v-if="props.loading" />
    <slot />
  </AlertDialogAction>
</template>
