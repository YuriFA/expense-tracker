<script setup lang="ts">
import { useAccounts, AccountCardSkeleton, type AccountWithBalance } from '@/entities/account'
import { useI18n } from 'vue-i18n'
import { PageHeader } from '@/shared/ui/page-header'
import AccountCard from './AccountCard.vue'
import { Card, CardContent } from '@/shared/ui/card'
import { formatMoney, DEFAULT_CURRENCY, type CurrencyCode } from '@/shared/lib/money'
import { ErrorState } from '@/shared/ui/error-state'
import { EmptyState } from '@/shared/ui/empty-state'
import { computed, ref } from 'vue'
import { AddAccountDialog } from '../features/add-account'
import EditAccountDialog from '../features/edit-account/ui/EditAccountDialog.vue'
import ReconcileAccountDialog from '../features/reconcile-account/ui/ReconcileAccountDialog.vue'
import { DeleteAccountDialog } from '../features/delete-account'

const { t, locale } = useI18n()
// Skeletons only while NO data exists yet (background refetches keep cards).
const { data, error, isPending, refetch } = useAccounts()

const totalsByCurrency = computed(() => {
  const totals = new Map<CurrencyCode, number>()
  for (const account of data.value ?? []) {
    const current = totals.get(account.currency) ?? 0
    totals.set(account.currency, current + (account.balance ?? 0))
  }
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }))
})

const format = (value: number, currency: CurrencyCode) =>
  formatMoney(value, currency, locale.value)

// One dialog instance per flow, hoisted out of the card grid: the card kebab
// sets the active account, the dialog pair reads it (the list/dialog
// convention - the RecentTransactions shape).
const editOpen = ref(false)
const reconcileOpen = ref(false)
const deleteOpen = ref(false)
const activeAccount = ref<AccountWithBalance | null>(null)
const pendingDeleteId = ref<string | null>(null)

const openEdit = (account: AccountWithBalance) => {
  activeAccount.value = account
  editOpen.value = true
}

const openReconcile = (account: AccountWithBalance) => {
  activeAccount.value = account
  reconcileOpen.value = true
}

const openDelete = (account: AccountWithBalance) => {
  activeAccount.value = null
  pendingDeleteId.value = account.id
  deleteOpen.value = true
}
</script>

<template>
  <section>
    <PageHeader :title="t('pages.accounts')" :subtitle="t('accounts.description')">
      <template #actions>
        <AddAccountDialog />
      </template>
    </PageHeader>

    <!-- Warm-minimal tinted info card: the teal wash carries the hero total
         (the paper redesign replaces the old indigo gradient). -->
    <Card class="mt-4 gap-1 border-primary/15 bg-accent py-5 md:py-5">
      <CardContent>
        <p class="text-[13px] font-medium tracking-wide text-primary uppercase">
          {{ t('accounts.totalBalance') }}
        </p>
        <div v-if="totalsByCurrency.length === 0" class="text-[32px] font-bold tabular-nums">
          {{ format(0, DEFAULT_CURRENCY) }}
        </div>
        <div v-else class="flex flex-col">
          <p
            v-for="total in totalsByCurrency"
            :key="total.currency"
            class="text-[32px] font-bold tabular-nums"
          >
            {{ format(total.amount, total.currency) }}
          </p>
        </div>
      </CardContent>
    </Card>

    <ul class="mt-6 grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 flex-wrap">
      <template v-if="isPending">
        <li v-for="n in 3" :key="n">
          <AccountCardSkeleton />
        </li>
      </template>
      <li v-else-if="error" class="col-span-full">
        <ErrorState @retry="refetch" />
      </li>
      <li v-else-if="data && data.length === 0" class="col-span-full">
        <EmptyState
          :title="t('accounts.noAccounts')"
          :description="t('accounts.noAccountsDescription')"
        />
      </li>
      <template v-else>
        <li v-for="account in data" :key="account.id">
          <AccountCard
            :account
            @edit="openEdit(account)"
            @reconcile="openReconcile(account)"
            @delete="openDelete(account)"
          />
        </li>
      </template>
    </ul>

    <EditAccountDialog
      v-if="activeAccount"
      v-model:open="editOpen"
      :account="activeAccount"
    />
    <ReconcileAccountDialog
      v-if="activeAccount"
      v-model:open="reconcileOpen"
      :account="activeAccount"
    />
    <DeleteAccountDialog
      v-if="pendingDeleteId"
      v-model:open="deleteOpen"
      :account-id="pendingDeleteId"
    />
  </section>
</template>
