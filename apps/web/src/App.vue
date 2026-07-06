<script setup lang="ts">
import { ProgressProvider } from '@bprogress/vue'
import AppShell from '@/app/layout/AppShell.vue'
import RouteProgress from '@/app/layout/RouteProgress'
import { Toaster } from '@/shared/ui/sonner'
import 'vue-sonner/style.css'
import './bprogress.css'
</script>

<template>
  <ProgressProvider :disable-style="true" :options="{ showSpinner: false }">
    <RouteProgress />
    <AppShell />
    <Toaster />
  </ProgressProvider>
</template>
