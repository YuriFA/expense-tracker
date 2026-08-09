<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNav from './AppNav.vue'

const route = useRoute()
// Auth entry points (login/register/verify/reset) render full-screen without
// the app navigation.
const showNav = computed(() => !route.meta.public)
</script>

<template>
  <div class="min-h-screen">
    <AppNav v-if="showNav" />

    <main class="mx-auto max-w-5xl px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>
