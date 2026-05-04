<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAccountsStore } from '@/stores/use-accounts-store'
import { useI18n } from 'vue-i18n'

const accounts = useAccountsStore()
const { t } = useI18n()

const { accountId } = defineProps<{
  accountId: string
  // eslint-disable-next-line vue/require-default-prop
  class?: string
}>()
</script>

<template>
  <Select :model-value="accountId" disabled>
    <SelectTrigger
      id="account"
      :class="['w-full min-w-0 md:min-w-24 [&>svg]:hidden', $props.class]"
    >
      <SelectValue :placeholder="t('addTransaction.accountPlaceholder')" />
    </SelectTrigger>
    <SelectContent position="item-aligned">
      <SelectItem v-for="item in accounts.items" :key="item.id" :value="item.id">
        {{ item.name }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
