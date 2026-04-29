<template>
  <div class="min-h-screen bg-slate-50 text-slate-950">
    <AppNav />

    <main class="mx-auto max-w-5xl px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppNav from './AppNav.vue'
</script>
