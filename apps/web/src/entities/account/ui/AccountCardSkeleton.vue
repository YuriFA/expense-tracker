<script setup lang="ts">
import { Card } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
</script>

<template>
  <!-- Mirrors the AccountCard anatomy: avatar circle, name bar, kebab
       placeholder, balance bar. -->
  <Card class="gap-3 p-4 md:p-5">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Skeleton class="size-11 rounded-full" />
        <Skeleton class="h-4 w-24" />
      </div>
      <Skeleton class="size-9" />
    </div>
    <Skeleton class="h-6 w-32" />
  </Card>
</template>
