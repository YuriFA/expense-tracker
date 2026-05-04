<script setup lang="ts">
import AppNav from './AppNav.vue'
</script>

<template>
  <div class="min-h-screen">
    <AppNav />

    <main class="mx-auto max-w-5xl px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>

