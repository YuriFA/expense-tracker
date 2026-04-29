<template>
  <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <h1 class="text-2xl font-semibold text-slate-900">{{ t('pages.settings') }}</h1>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
