<script setup lang="ts">
import type { Component } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = withDefaults(
  defineProps<{
    label: string
    amount: string
    icon: Component
    tone?: 'primary' | 'success' | 'warning' | 'neutral'
  }>(),
  { tone: 'primary' },
)

// Full class strings so Tailwind can statically extract them.
const toneClasses: Record<NonNullable<(typeof props)['tone']>, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  neutral: 'bg-secondary text-secondary-foreground',
}
</script>

<template>
  <div class="bg-card text-card-foreground flex items-center gap-3 rounded-xl border p-4">
    <span
      :class="cn('flex size-10 shrink-0 items-center justify-center rounded-full', toneClasses[props.tone])"
      aria-hidden="true"
    >
      <component :is="props.icon" class="size-5" />
    </span>
    <div class="min-w-0">
      <p class="truncate text-xs text-muted-foreground">{{ props.label }}</p>
      <p class="text-lg font-bold tabular-nums">{{ props.amount }}</p>
    </div>
  </div>
</template>
