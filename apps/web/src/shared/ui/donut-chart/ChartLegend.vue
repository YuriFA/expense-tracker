<script setup lang="ts">
interface ChartLegendEntry {
  id: string
  label: string
  color: string
  /** Preformatted share caption (e.g. «72%»), shown muted after the label. */
  percent?: string
}

defineProps<{
  entries: readonly ChartLegendEntry[]
}>()
</script>

<template>
  <ul class="space-y-1.5" data-testid="chart-legend">
    <li v-for="entry in entries" :key="entry.id" class="flex items-center gap-2 text-sm">
      <span
        class="size-2.5 shrink-0 rounded-full"
        :style="{ backgroundColor: entry.color }"
        aria-hidden="true"
      />
      <span class="truncate">{{ entry.label }}</span>
      <span v-if="entry.percent" class="shrink-0 text-xs text-muted-foreground">
        {{ entry.percent }}
      </span>
    </li>
  </ul>
</template>
