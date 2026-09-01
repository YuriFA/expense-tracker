<script setup lang="ts">
import type { SelectValueProps } from 'reka-ui'
import { SelectValue, injectSelectRootContext } from 'reka-ui'
import { computed, useSlots } from 'vue'
import { useDesktopPresentation } from '@/shared/lib/presentation'

const props = defineProps<SelectValueProps>()

const context = injectSelectRootContext()
const slots = useSlots()
const isDesktop = useDesktopPresentation()

const hasValue = computed(() => context.modelValue.value !== undefined && context.modelValue.value !== '')
const selectedText = computed(() => {
  const modelValue = context.modelValue.value
  const option = Array.from(context.optionsSet.value).find((candidate) => candidate.value === modelValue)

  return option?.textContent || props.placeholder || ''
})
</script>

<template>
  <SelectValue v-if="isDesktop" data-slot="select-value" v-bind="props">
    <slot />
  </SelectValue>

  <span v-else data-slot="select-value" :data-placeholder="!hasValue || undefined">
    <slot v-if="hasValue && slots.default" />
    <template v-else>{{ selectedText }}</template>
  </span>
</template>
