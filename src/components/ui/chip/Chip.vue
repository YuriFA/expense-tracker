<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { Badge, type BadgeVariants } from '../badge'
import { Button } from '../button'
import { X } from 'lucide-vue-next'

const props = defineProps<
  PrimitiveProps & {
    variant?: BadgeVariants['variant']
    class?: HTMLAttributes['class']
    onRemove: () => void
  }
>()
</script>

<template>
  <Badge v-bind="props">
    <slot />
    <Button variant="ghost" size="xs" class="p-1 size-5! rounded-full" @click="onRemove">
      <X />
    </Button>
  </Badge>
</template>
