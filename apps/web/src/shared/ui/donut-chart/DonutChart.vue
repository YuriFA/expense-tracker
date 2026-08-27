<script setup lang="ts">
import { computed } from 'vue'

/**
 * One donut segment: `id` identifies it (selection/hit-testing), `color` is
 * the fill (category color data or a token-derived neutral), `value` sizes
 * the segment's share of the ring.
 */
export interface DonutChartEntry {
  id: string
  label: string
  color: string
  value: number
}

const props = withDefaults(
  defineProps<{
    entries: readonly DonutChartEntry[]
    /** Pixel size of the square SVG canvas. */
    size?: number
    strokeWidth?: number
    /** Highlighted segment id; others dim while set. */
    selectedId?: string | null
    /** Accessible summary of the charted distribution. */
    ariaLabel?: string
  }>(),
  {
    size: 120,
    strokeWidth: 14,
    selectedId: null,
    ariaLabel: undefined,
  },
)

const emit = defineEmits<{
  select: [id: string]
}>()

interface SegmentView {
  id: string
  color: string
  dashArray: string
  dashOffset: number
}

// Angular gap between segments (2deg, shrinking for many segments) expressed
// in dash pixels; a lone segment renders as a full ring without gaps - the
// same spans the mobile Skia donut draws.
const segments = computed(() => {
  const total = props.entries.reduce((sum, entry) => sum + entry.value, 0)
  const radius = (props.size - props.strokeWidth) / 2 - 4
  const circumference = 2 * Math.PI * radius
  if (total <= 0 || props.entries.length === 0) {
    return { radius, rings: [] as SegmentView[], neutral: true }
  }
  const gapDegrees = props.entries.length > 1 ? Math.min(2, 360 / props.entries.length) : 0
  const gapPx = (gapDegrees / 360) * circumference
  let offset = 0
  const rings = props.entries.map((entry) => {
    const fraction = entry.value / total
    const dash = Math.max(fraction * circumference - gapPx, 0.1)
    const view: SegmentView = {
      id: entry.id,
      color: entry.color,
      dashArray: `${dash} ${circumference - dash}`,
      dashOffset: -offset,
    }
    offset += fraction * circumference
    return view
  })
  return { radius, rings, neutral: false }
})
</script>

<template>
  <div class="relative inline-flex" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      :aria-label="ariaLabel"
      role="img"
      data-testid="donut-chart"
    >
      <!-- Nothing chartable (empty period / all categories excluded): a single
           neutral token-colored ring. -->
      <circle
        v-if="segments.neutral"
        :cx="size / 2"
        :cy="size / 2"
        :r="segments.radius"
        fill="none"
        class="stroke-muted-foreground"
        :stroke-width="strokeWidth"
      />
      <template v-else>
        <circle
          v-for="segment in segments.rings"
          :key="segment.id"
          :cx="size / 2"
          :cy="size / 2"
          :r="segments.radius"
          fill="none"
          :stroke="segment.color"
          :stroke-width="selectedId === segment.id ? strokeWidth + 6 : strokeWidth"
          :stroke-dasharray="segment.dashArray"
          :stroke-dashoffset="segment.dashOffset"
          :opacity="selectedId && selectedId !== segment.id ? 0.35 : 1"
          class="cursor-pointer transition-[stroke-width,opacity]"
          data-testid="donut-segment"
          :data-segment-id="segment.id"
          @click="emit('select', segment.id)"
        />
      </template>
    </svg>
    <div
      v-if="$slots.default"
      class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
    >
      <slot />
    </div>
  </div>
</template>
