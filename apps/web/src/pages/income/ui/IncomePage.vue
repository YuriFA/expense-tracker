<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CashflowForm } from '@/features/transaction/add'

// Quick income entry (web-screens capability): the mobile income flow's
// minimal steps - amount, account, income category, description - reusing
// the shared cashflow form feature. Local by construction; the created
// transaction lands in the cashflow data immediately.

const { t } = useI18n()
</script>

<template>
  <section class="mx-auto max-w-md">
    <h1 class="text-2xl font-semibold">{{ t('pages.income') }}</h1>
    <div class="mt-6">
      <CashflowForm type="income" />
    </div>
  </section>
</template>
