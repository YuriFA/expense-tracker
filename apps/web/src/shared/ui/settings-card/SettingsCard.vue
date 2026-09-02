<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

// The ONE settings card wrapper (settings design language, Direction D):
// flat card, caps micro-header strip with a hairline below, content area.
// Every settings surface - the settings page sections and the categories
// management sub-screen - renders its sections through this component so
// the cards stay homogeneous (approved canvas drafts: «Настройки»,
// «Категории (управление)»).
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    /** Caps micro-header text (i18n-resolved by the caller). */
    title?: string
    /** Extra classes for the content area (e.g. 'p-0' for full-bleed rows). */
    contentClass?: HTMLAttributes['class']
  }>(),
  { title: undefined, contentClass: undefined },
)
</script>

<template>
  <Card v-bind="$attrs">
    <CardHeader class="border-b [.border-b]:pb-3">
      <slot name="title">
        <CardTitle>{{ title }}</CardTitle>
      </slot>
      <div v-if="$slots.actions" data-slot="card-action" class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </CardHeader>
    <CardContent :class="contentClass">
      <slot />
    </CardContent>
  </Card>
</template>
