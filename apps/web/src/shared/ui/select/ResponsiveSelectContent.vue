<script setup lang="ts">
import type { SelectContentEmits, SelectContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { computed } from 'vue'
import { SelectContent, SelectPortal, SelectViewport, injectSelectRootContext, useForwardPropsEmits } from 'reka-ui'
import { useDesktopPresentation } from '@/shared/lib/presentation'
import { cn } from '@/shared/lib/utils'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/shared/ui/drawer'
import { SelectScrollDownButton, SelectScrollUpButton } from '.'

const props = withDefaults(
  defineProps<SelectContentProps & { class?: HTMLAttributes['class']; title?: string }>(),
  {
    class: undefined,
    title: undefined,
    position: 'popper',
  },
)
const emits = defineEmits<SelectContentEmits>()

const delegatedProps = reactiveOmit(props, 'class', 'title')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
const context = injectSelectRootContext()
const isDesktop = useDesktopPresentation()

const contentClass = computed(() =>
  cn(
    'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--reka-select-content-available-height) min-w-32 overflow-x-hidden overflow-y-auto rounded-input border shadow-md',
    props.position === 'popper' &&
      'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
    props.class,
  ),
)
</script>

<template>
  <SelectPortal v-if="isDesktop">
    <SelectContent data-slot="select-content" v-bind="{ ...$attrs, ...forwarded }" :class="contentClass">
      <SelectScrollUpButton />
      <SelectViewport
        :class="
          cn(
            'p-1',
            position === 'popper' &&
              'h-(--reka-select-trigger-height) w-full min-w-(--reka-select-trigger-width) scroll-my-1',
          )
        "
      >
        <slot />
      </SelectViewport>
      <SelectScrollDownButton />
    </SelectContent>
  </SelectPortal>

  <Drawer
    v-else
    :open="context.open.value"
    @update:open="(value: boolean) => context.onOpenChange(value)"
  >
    <DrawerContent :id="context.contentId" class="max-h-[calc(100dvh-1rem)]">
      <template v-if="props.title" #header>
        <DrawerHeader>
          <DrawerTitle>{{ props.title }}</DrawerTitle>
        </DrawerHeader>
      </template>
      <div class="px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <slot />
      </div>
    </DrawerContent>
  </Drawer>
</template>
