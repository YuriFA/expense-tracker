<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Debtor } from '@/entities/debtor'
import { useDebtors } from '@/entities/debtor'
import {
  totalsByDirection,
  useDebtOperations,
  type DebtDirection,
} from '@/entities/debt-operation'
import DebtsSummaryCard from './DebtsSummaryCard.vue'
import DebtorSection from './DebtorSection.vue'
import DebtorHistoryDialog from './DebtorHistoryDialog.vue'
import NewDebtorDebtDialog from './NewDebtorDebtDialog.vue'
import { Card, CardContent } from '@/shared/ui/card'
import { ErrorState } from '@/shared/ui/error-state'
import { Skeleton } from '@/shared/ui/skeleton'

// Debts screen (debts capability): two independent direction sections with
// summary cards, debtor rows with derived balances. One `useDebtors` + one
// full `useDebtOperations` read - every figure derives in memory.

const { t } = useI18n()

const {
  data: debtors,
  isLoading: debtorsLoading,
  error: debtorsError,
  refetch: refetchDebtors,
} = useDebtors()
const {
  data: operations,
  isLoading: operationsLoading,
  error: operationsError,
  refetch: refetchOperations,
} = useDebtOperations()

const isLoading = computed(() => debtorsLoading.value || operationsLoading.value)
const error = computed(() => debtorsError.value || operationsError.value)
const refetch = () => Promise.all([refetchDebtors(), refetchOperations()])

const totals = computed(() => totalsByDirection(operations.value ?? []))

// One dialog instance + active item refs (convention 4).
const historyOpen = ref(false)
const activeDebtor = ref<Debtor | null>(null)
const activeDirection = ref<DebtDirection>('receivable')

const openHistory = (debtor: Debtor, direction: DebtDirection) => {
  activeDebtor.value = debtor
  activeDirection.value = direction
  historyOpen.value = true
}

const newDebtorOpen = ref(false)
const newDebtorDirection = ref<DebtDirection>('receivable')

const openNewDebtor = (direction: DebtDirection) => {
  newDebtorDirection.value = direction
  newDebtorOpen.value = true
}
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold">{{ t('pages.debts') }}</h1>

    <div v-if="isLoading" class="mt-6 space-y-4">
      <Skeleton class="h-28 rounded-xl" />
      <Skeleton class="h-40 rounded-xl" />
    </div>
    <div v-else-if="error" class="mt-6">
      <ErrorState @retry="refetch" />
    </div>
    <template v-else>
      <div class="mt-6">
        <DebtsSummaryCard :totals="totals" />
      </div>

      <Card class="mt-4">
        <CardContent class="flex flex-col gap-4 pb-6">
          <DebtorSection
            v-for="direction in (['receivable', 'payable'] as const)"
            :key="direction"
            :direction="direction"
            :debtors="debtors ?? []"
            :operations="operations ?? []"
            @add="openNewDebtor"
            @select="openHistory"
          />
        </CardContent>
      </Card>
    </template>

    <DebtorHistoryDialog
      v-if="activeDebtor && historyOpen"
      :key="`${activeDebtor.id}-${activeDirection}`"
      v-model:open="historyOpen"
      :debtor="activeDebtor"
      :direction="activeDirection"
      :operations="operations ?? []"
    />

    <NewDebtorDebtDialog
      v-if="newDebtorOpen"
      :key="newDebtorDirection"
      v-model:open="newDebtorOpen"
      :direction="newDebtorDirection"
    />
  </section>
</template>
