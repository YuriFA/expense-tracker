<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrencyFormatter } from '@/composables/use-currency-formatter'
import { generateHashIndex } from '@/shared/lib/hash-generator'
import type { AccountWithBalance } from '@/entities/account/types'
import { computed } from 'vue'

const { account } = defineProps<{
  account: AccountWithBalance
}>()

const index = computed(() => generateHashIndex(account.id))
const { format } = useCurrencyFormatter()
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
      <p class="text-xl font-bold">{{ format(account.balance) }}</p>
    </CardContent>
  </Card>
</template>
