<script setup lang="ts">
import { Skeleton } from '@/shared/ui/skeleton'
</script>

<template>
  <li class="flex items-center gap-3 px-4 py-2.5 md:px-6">
    <Skeleton class="size-10 rounded-full" />
    <div class="flex-1 space-y-1">
      <Skeleton class="h-3 w-32" />
      <Skeleton class="h-3 w-48" />
    </div>
    <Skeleton class="h-4 w-20" />
    <Skeleton class="size-9" />
  </li>
</template>
