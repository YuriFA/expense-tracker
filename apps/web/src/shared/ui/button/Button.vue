<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { ButtonHTMLAttributes, HTMLAttributes } from 'vue'
import type { ButtonVariants } from '.'
import { Primitive } from 'reka-ui'
import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '.'
import { Spinner } from '../spinner'

interface Props extends PrimitiveProps {
  type?: ButtonHTMLAttributes['type']
  // eslint-disable-next-line vue/require-default-prop
  variant?: ButtonVariants['variant']
  // eslint-disable-next-line vue/require-default-prop
  size?: ButtonVariants['size']
  // eslint-disable-next-line vue/require-default-prop
  class?: HTMLAttributes['class']
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  type: 'button',
})
</script>

<template>
  <Primitive
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
    :type="props.type"
  >
    <Spinner v-if="loading" />
    <slot />
  </Primitive>
</template>
