<script setup lang="ts">
import type { SelectTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ChevronDown } from '@lucide/vue'
import { SelectIcon, SelectTrigger, injectSelectRootContext, useForwardProps } from 'reka-ui'
import { computed, useAttrs } from 'vue'
import { useDesktopPresentation } from '@/shared/lib/presentation'
import { cn } from '@/shared/lib/utils'

const props = withDefaults(
  defineProps<SelectTriggerProps & { class?: HTMLAttributes['class']; size?: 'sm' | 'default' }>(),
  { class: undefined, size: 'default' },
)

defineOptions({
  inheritAttrs: false,
})

const delegatedProps = reactiveOmit(props, 'class', 'size')
const forwardedProps = useForwardProps(delegatedProps)
const context = injectSelectRootContext()
const isDesktop = useDesktopPresentation()
const attrs = useAttrs()

const triggerClass = computed(() =>
  cn(
    "border-input data-placeholder:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-primary/10 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-input border bg-transparent px-3 py-2.5 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-10 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    props.class,
  ),
)
</script>

<template>
  <SelectTrigger
    v-if="isDesktop"
    data-slot="select-trigger"
    :data-size="size"
    v-bind="{ ...attrs, ...forwardedProps }"
    :class="triggerClass"
  >
    <slot />
    <SelectIcon as-child>
      <ChevronDown class="size-4 opacity-50" />
    </SelectIcon>
  </SelectTrigger>

  <button
    v-else
    :ref="(node) => context.onTriggerChange(node as HTMLElement | undefined)"
    type="button"
    data-slot="select-trigger"
    :data-size="size"
    v-bind="attrs"
    :class="triggerClass"
    :aria-controls="context.contentId"
    aria-haspopup="dialog"
    :aria-expanded="context.open.value"
    :disabled="props.disabled"
    @click="context.onOpenChange(true)"
  >
    <slot />
    <ChevronDown class="size-4 opacity-50" />
  </button>
</template>
