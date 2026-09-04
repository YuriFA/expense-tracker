<script setup lang="ts" generic="T extends string">
import type { AcceptableValue } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

// Single-select segmented control - the design-system field-level
// counterpart of Tabs: same look (muted track, active segment raised on
// the surface color), different semantics. Use it for mutually exclusive
// form/filter choices (category type, analytics period, debt kind); use
// Tabs when the segments own content panels. Built on reka-ui ToggleGroup
// (roving focus + arrow keys, aria-pressed items).

export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
  /** Per-item testid - specs click items by stable ids. */
  testid?: string
}

const props = defineProps<{
  modelValue: T
  options: readonly SegmentedControlOption<T>[]
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

// ToggleGroup single DE-selects on re-click (emits undefined); the field
// must always hold a value, so that click is a no-op.
function handleUpdate(value: AcceptableValue | AcceptableValue[] | undefined): void {
  if (typeof value !== 'string' || value === props.modelValue) return
  emit('update:modelValue', value as T)
}
</script>

<template>
  <ToggleGroupRoot
    type="single"
    :model-value="props.modelValue"
    data-slot="segmented-control"
    :class="
      cn(
        'bg-muted text-muted-foreground inline-flex h-10 w-fit items-center justify-center rounded-[10px] p-1',
        props.class,
      )
    "
    @update:model-value="handleUpdate"
  >
    <ToggleGroupItem
      v-for="option in props.options"
      :key="option.value"
      :value="option.value"
      :data-testid="option.testid"
      data-slot="segmented-control-item"
      :class="
        cn(
          'data-[state=on]:bg-background focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=on]:border-input dark:data-[state=on]:bg-input/30 text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center rounded-[8px] border border-transparent px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:font-semibold data-[state=on]:text-foreground data-[state=on]:shadow-sm',
        )
      "
    >
      {{ option.label }}
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>
