<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

// Shared shell for the dashboard's list cards, matching the canvas spec:
// the header sits flush at the card top with a fixed height (title centered
// on the action line, hairline divider below), and the content owns its own
// padding - full-bleed content passes `content-class="px-0!"`.
const props = defineProps<{
  title: string
  class?: HTMLAttributes['class']
  contentClass?: HTMLAttributes['class']
}>()
</script>

<template>
  <Card :class="props.class" class="gap-0 py-0 md:py-0">
    <CardHeader class="flex h-13 items-center justify-between gap-2 pb-0">
      <CardTitle>{{ title }}</CardTitle>
      <CardAction v-if="$slots.action" class="self-center">
        <slot name="action" />
      </CardAction>
    </CardHeader>
    <CardContent :class="props.contentClass">
      <slot />
    </CardContent>
  </Card>
</template>
