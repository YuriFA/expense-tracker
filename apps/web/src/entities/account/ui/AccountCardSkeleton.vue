<script setup lang="ts">
import { Card, CardAction, CardContent, CardHeader } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
</script>

<template>
  <Card class="py-2 md:py-3">
    <CardHeader class="px-2 md:px-3">
      <div class="flex items-center gap-4">
        <Skeleton class="size-10 rounded-sm" />
        <Skeleton class="h-4 w-24" />
      </div>
      <CardAction>
        <Skeleton class="size-8" />
      </CardAction>
    </CardHeader>
    <CardContent class="px-3 md:px-4">
      <Skeleton class="h-5 w-32" />
    </CardContent>
  </Card>
</template>
