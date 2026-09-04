<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import { Button } from '@/shared/ui/button'

// The ONE internal-page header (design-system hard rule; approved canvas
// «Сложные компоненты» section 11): root pages (sidebar entries) render
// title + optional subtitle + right-side actions; child pages add the
// round outline back icon-button inline left of the title. The title is
// always 32px bold tracking-tight, the subtitle is optional, and there is
// no separate compact variant below 768px - the row just wraps.
//
// Every page under the shell must render its header through this
// component (enforced by app/router/page-header.test.ts).
defineOptions({ inheritAttrs: false })

defineProps<{
  /** Page title (i18n-resolved by the caller). */
  title: string
  /** Optional one-line muted subtitle under the title. */
  subtitle?: string
  /** Child pages only: back navigation target. */
  backTo?: RouteLocationRaw
  /** Accessible label for the back control (i18n-resolved by the caller). */
  backLabel?: string
}>()
</script>

<template>
  <header v-bind="$attrs" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
    <div class="flex min-w-0 items-center gap-3">
      <Button
        v-if="backTo"
        as-child
        variant="outline"
        size="icon"
        class="shrink-0 rounded-full"
        :aria-label="backLabel"
        data-testid="page-header-back"
      >
        <RouterLink :to="backTo">
          <ArrowLeft class="size-4" aria-hidden="true" />
        </RouterLink>
      </Button>
      <div class="min-w-0">
        <h1 class="text-[32px] font-bold tracking-tight">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1 text-sm text-muted-foreground">{{ subtitle }}</p>
      </div>
    </div>

    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
