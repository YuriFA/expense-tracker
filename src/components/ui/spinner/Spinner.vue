<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Loader2Icon } from '@lucide/vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <Loader2Icon role="status" :class="cn('size-4 animate-spin', props.class)" />
</template>
