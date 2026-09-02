<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { cn } from '@/shared/lib/utils'

// The ONE settings card wrapper (settings design language, Direction D):
// flat card, caps micro-header strip with a hairline below, content area.
// Every settings surface - the settings page sections and the categories
// management sub-screen - renders its sections through this component so
// the cards stay homogeneous (approved canvas drafts: «Настройки»,
// «Категории (управление)»).
//
// Geometry follows the canvas: the Card primitive's own vertical padding
// is neutralised; the header strip is a snug py-3 band around the caps
// label (~40px tall with the hairline), and the content area carries the
// breathing room (py-5, ~76px for a standard 36px control row).
// gap-0 kills the shadcn header's title/description row gap: the second
// explicit grid row is always empty here (no description), but grid gap
// still applies between tracks and would pad every strip by 6px.
defineOptions({ inheritAttrs: false })

const props = withDefaults(
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
  <Card class="gap-0 py-0 md:py-0" v-bind="$attrs">
    <CardHeader class="gap-0 border-b py-3">
      <slot name="title">
        <CardTitle>{{ title }}</CardTitle>
      </slot>
      <div v-if="$slots.actions" data-slot="card-action" class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </CardHeader>
    <CardContent :class="cn('py-5', props.contentClass)">
      <slot />
    </CardContent>
  </Card>
</template>
