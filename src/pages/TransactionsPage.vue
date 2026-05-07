<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold">{{ t('pages.transactions') }}</h1>
  </section>
</template>
