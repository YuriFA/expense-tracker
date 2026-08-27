<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { AnalyticsDirection } from '@/entities/analytics'
import AnalyticsDetailView from './AnalyticsDetailView.vue'

// Route: /analytics/:direction — invalid params fall back to expenses, like
// the mobile detail route. Keyed on direction so the view remounts with
// fresh period/selection state when the card switches direction.
const route = useRoute()
const direction = computed<AnalyticsDirection>(() =>
  route.params.direction === 'income' ? 'income' : 'expense',
)
</script>

<template>
  <AnalyticsDetailView :key="direction" :direction="direction" />
</template>
