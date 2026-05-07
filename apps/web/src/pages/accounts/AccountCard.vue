<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAccountBalances } from '@/composables/use-account-balances'
import { useCurrencyFormatter } from '@/composables/use-currency-formatter'
import { generateHashIndex } from '@/shared/lib/hash-generator'
import type { Account } from '@/types/account'
import { computed } from 'vue'

const { account } = defineProps<{
  account: Account
}>()

const index = computed(() => generateHashIndex(account.id))

const { format } = useCurrencyFormatter()
const { getAccountBalance } = useAccountBalances()

const balance = computed(() => {
  return format(getAccountBalance(account.id) ?? 0)
})
</script>

<template>
  <Card>
    <CardHeader class="flex items-center gap-4">
      <div
        class="size-10 rounded-sm flex items-center justify-center"
        :style="{ backgroundColor: `var(--avatar-color-${index})` }"
      >
        {{ account.name.at(0) }}
      </div>

      <CardTitle>{{ account.name }}</CardTitle>
    </CardHeader>
    <CardContent>
      <p class="text-xl font-bold">{{ balance }}</p>
    </CardContent>
  </Card>
</template>
