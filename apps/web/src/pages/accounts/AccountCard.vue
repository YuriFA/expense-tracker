<script setup lang="ts">
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { formatCurrency } from '@/shared/lib/money/format'
import { generateHashIndex } from '@/shared/lib/hash-generator'
import type { AccountWithBalance } from '@/entities/account/types'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/app/use-settings-store'
import DeleteAccountDialog from '@/features/delete-account/DeleteAccountDialog.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Button } from '@/shared/ui/button'
import { MoreVertical, Trash2 } from '@lucide/vue'

const { account } = defineProps<{
  account: AccountWithBalance
}>()

const index = computed(() => generateHashIndex(account.id))
const { locale, t } = useI18n()
const settings = useSettingsStore()
const format = (value: number) => formatCurrency(value, settings.currency, locale.value)

const deleteDialogOpen = ref(false)
</script>

<template>
  <Card class="py-2 md:py-3">
    <CardHeader class="px-2 md:px-3">
      <div class="flex items-center gap-4">
        <div
          class="size-10 rounded-sm flex items-center justify-center"
          :style="{ backgroundColor: `var(--avatar-color-${index})` }"
        >
          {{ account.name.at(0) }}
        </div>
        <CardTitle>{{ account.name }}</CardTitle>
      </div>

      <CardAction>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon">
              <MoreVertical class="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" @select="deleteDialogOpen = true">
              <Trash2 class="size-4" />
              {{ t('deleteAccount.trigger') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardAction>
    </CardHeader>
    <CardContent class="px-3 md:px-4">
      <p class="text-xl font-bold">{{ format(account.balance) }}</p>
    </CardContent>
  </Card>

  <DeleteAccountDialog v-model:open="deleteDialogOpen" :account-id="account.id" />
</template>
