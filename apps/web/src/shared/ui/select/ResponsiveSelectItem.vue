<script setup lang="ts">
import type { SelectItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Check } from '@lucide/vue'
import { SelectItem, SelectItemIndicator, SelectItemText, injectSelectRootContext, useForwardProps } from 'reka-ui'
import { computed, onMounted, onUnmounted, onUpdated, ref } from 'vue'
import { useDesktopPresentation } from '@/shared/lib/presentation'
import { cn } from '@/shared/lib/utils'

const props = defineProps<SelectItemProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
const forwardedProps = useForwardProps(delegatedProps)
const context = injectSelectRootContext()
const isDesktop = useDesktopPresentation()
const itemElement = ref<HTMLElement>()
let registeredOption: { value: unknown; disabled?: boolean; textContent: string } | null = null

const itemClass = computed(() =>
  cn(
    'focus:bg-accent focus:text-accent-foreground [&_svg:not([class*=\'text-\'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-3 rounded-sm py-2.5 pr-8 pl-4 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2',
    props.class,
  ),
)
const isSelected = computed(() => context.modelValue.value === props.value)

const setItemElement = (node: Element | { $el?: Element } | null) => {
  itemElement.value = (node instanceof Element ? node : node?.$el) as HTMLElement | undefined
}

const registerOption = () => {
  if (!itemElement.value) {
    return
  }

  if (registeredOption) {
    context.onOptionRemove(registeredOption)
  }

  registeredOption = {
    value: props.value,
    disabled: props.disabled,
    textContent: itemElement.value.textContent?.trim() ?? '',
  }
  context.onOptionAdd(registeredOption)
}

onMounted(registerOption)
onUpdated(registerOption)
onUnmounted(() => {
  if (registeredOption) {
    context.onOptionRemove(registeredOption)
  }
})

const handleSelect = () => {
  if (props.disabled) {
    return
  }

  context.onValueChange(props.value)
  context.onOpenChange(false)
}
</script>

<template>
  <SelectItem v-if="isDesktop" data-slot="select-item" v-bind="forwardedProps" :class="itemClass">
    <span class="absolute right-2 flex size-3.5 items-center justify-center">
      <SelectItemIndicator>
        <slot name="indicator-icon">
          <Check class="size-4 text-primary" />
        </slot>
      </SelectItemIndicator>
    </span>

    <SelectItemText>
      <slot />
    </SelectItemText>
  </SelectItem>

  <button
    v-else
    :ref="setItemElement"
    type="button"
    data-slot="select-item"
    :class="cn(itemClass, 'cursor-pointer rounded-input px-4')"
    :aria-selected="isSelected"
    :disabled="props.disabled"
    @click="handleSelect"
  >
    <span class="min-w-0 flex-1 text-left">
      <slot />
    </span>
    <Check v-if="isSelected" class="size-4 text-primary" />
  </button>
</template>
