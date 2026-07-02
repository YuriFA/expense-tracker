<script setup lang="ts">
import { useAccounts } from '@/entities/account/use-accounts'
import { useI18n } from 'vue-i18n'
import AccountCard from './AccountCard.vue'
import { Card, CardContent } from '@/components/ui/card'
import { useCurrencyFormatter } from '@/composables/use-currency-formatter'
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import AddAccountForm from '@/features/add-account/AddAccountForm.vue'

const { t } = useI18n()
const { data } = useAccounts()
const { format } = useCurrencyFormatter()
const totalBalanceFormatted = computed(() => {
  const totalBalance =
    data.value?.reduce((acc, account) => {
      return acc + (account.balance ?? 0)
    }, 0) ?? 0
  return format(totalBalance)
})

const dialogOpen = ref(false)
const handleSuccess = () => {
  toast.success(t('addAccount.success'))
  dialogOpen.value = false
}
</script>

<template>
  <section>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex-1">
        <h1 class="text-2xl font-semibold">{{ t('pages.accounts') }}</h1>
        <p class="text-muted-foreground text-sm">{{ t('accounts.description') }}</p>
      </div>

      <Dialog v-model:open="dialogOpen">
        <DialogTrigger as-child>
          <Button class="max-sm:w-full">{{ t('actions.create') }}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{{ t('addAccount.newAccount') }}</DialogTitle>
          </DialogHeader>
          <AddAccountForm @success="handleSuccess" />
        </DialogContent>
      </Dialog>
    </div>

    <Card class="mt-4 bg-linear-to-br from-primary to-primary/80 text-primary-foreground">
      <CardContent>
        <p class="text-sm">{{ t('accounts.totalBalance') }}</p>
        <p class="text-2xl font-semibold">
          {{ totalBalanceFormatted }}
        </p>
      </CardContent>
    </Card>

    <ul class="mt-6 grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 flex-wrap">
      <li v-for="account in data" :key="account.id">
        <AccountCard :account />
      </li>
    </ul>
  </section>
</template>
