<script lang="ts" setup>
import type { CalendarCellTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { CalendarCellTrigger, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/ui/button'

const props = withDefaults(
  // eslint-disable-next-line vue/require-default-prop
  defineProps<CalendarCellTriggerProps & { class?: HTMLAttributes['class'] }>(),
  {
    as: 'button',
  },
)

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <CalendarCellTrigger
    data-slot="calendar-cell-trigger"
    :class="
      cn(
        buttonVariants({ variant: 'ghost' }),
        'size-8 rounded-full p-0 font-normal aria-selected:opacity-100 cursor-default',
        // Today: outlined circle (draft), never filled
        '[&[data-today]:not([data-selected])]:border [&[data-today]:not([data-selected])]:border-primary [&[data-today]:not([data-selected])]:bg-transparent [&[data-today]:not([data-selected])]:text-primary',
        // Selected
        'data-selected:bg-primary data-selected:text-primary-foreground data-selected:opacity-100 [&[data-selected]:hover]:bg-primary data-selected:hover:text-primary-foreground data-selected:focus:bg-primary data-selected:focus:text-primary-foreground',
        // Disabled
        'data-disabled:text-muted-foreground data-disabled:opacity-50',
        // Unavailable
        'data-unavailable:text-destructive-foreground data-unavailable:line-through',
        // Outside months
        'data-outside-view:text-muted-foreground/50',
        props.class,
      )
    "
    v-bind="forwardedProps"
  >
    <slot />
  </CalendarCellTrigger>
</template>
