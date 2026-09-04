<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
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

// The amount repeats the tone (income green / expense terracotta); balance
// and debts stay ink.
const amountClasses: Record<NonNullable<(typeof props)['tone']>, string> = {
  primary: '',
  success: 'text-success',
  warning: 'text-warning',
  neutral: '',
}

// An amount is one unbreakable token (no-break separators), so instead of
// wrapping or clipping it steps down to fit its half-grid-column card. The
// dashboard caps strings at ~"999 999 ₽" via compact formatting; these two
// steps are the guard for longer figures any caller might pass. Below md the
// card runs compact (approved canvas «Кошелёк — мобильный обзор»): smaller
// paddings, icon and type scale, with the same step-down guard.
const amountSizeClass = computed(() => {
  const length = props.amount.length
  if (length >= 13) return 'text-base md:text-lg'
  if (length >= 9) return 'text-lg md:text-xl'
  return 'text-lg md:text-2xl'
})
</script>

<template>
  <div class="bg-card text-card-foreground rounded-lg border p-3 md:p-5">
    <div class="flex items-center gap-2 md:gap-3">
      <span
        :class="
          cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full md:size-10',
            toneClasses[props.tone],
          )
        "
        aria-hidden="true"
      >
        <component :is="props.icon" class="size-4 md:size-5" />
      </span>
      <p
        class="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:text-xs"
      >
        {{ props.label }}
      </p>
    </div>
    <p
      data-testid="stat-card-amount"
      class="mt-2 font-bold tabular-nums md:mt-3"
      :class="[amountSizeClass, amountClasses[props.tone]]"
    >
      {{ props.amount }}
    </p>
  </div>
</template>
