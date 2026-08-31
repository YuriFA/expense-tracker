<script setup lang="ts">
import AppSidebarNav from './AppSidebarNav.vue'
</script>

<template>
  <aside
    class="bg-sidebar text-sidebar-foreground sticky top-0 hidden h-screen w-62 shrink-0 flex-col border-r border-sidebar-border md:flex"
  >
    <AppSidebarNav />
  </aside>
</template>
