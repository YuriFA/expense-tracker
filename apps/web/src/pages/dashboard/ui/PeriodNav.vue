<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { Button } from '@/shared/ui/button'

// Dashboard header period navigator (approved canvas: «Обзор с
// переключателем периода»): quiet chevron steps around the period label.
// There is no lower bound on backward stepping; the caller disables the
// forward step at the current period.
withDefaults(
  defineProps<{
    label: string
    prevLabel: string
    nextLabel: string
    canNext?: boolean
  }>(),
  { canNext: true },
)

const emit = defineEmits<{ prev: []; next: [] }>()
</script>

<template>
  <nav class="flex h-8 items-center gap-1" data-testid="period-nav">
    <Button
      variant="ghost"
      size="icon-sm"
      class="text-muted-foreground"
      :aria-label="prevLabel"
      data-testid="period-nav-prev"
      @click="emit('prev')"
    >
      <ChevronLeft />
    </Button>
    <span class="px-1 text-base font-medium" data-testid="period-nav-label">{{ label }}</span>
    <Button
      variant="ghost"
      size="icon-sm"
      class="text-muted-foreground"
      :aria-label="nextLabel"
      :disabled="!canNext"
      data-testid="period-nav-next"
      @click="emit('next')"
    >
      <ChevronRight />
    </Button>
  </nav>
</template>
