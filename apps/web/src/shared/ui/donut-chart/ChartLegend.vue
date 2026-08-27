<script setup lang="ts">
defineProps<{
  entries: readonly { id: string; label: string; color: string }[]
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
    </li>
  </ul>
</template>
