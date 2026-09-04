<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'
import { useTransactionRepository } from '@/entities/transaction'
import { useDebtOperationRepository } from '@/entities/debt-operation'
import { usePlannedPaymentRepository } from '@/entities/planned-payment'
import { getHouseholdErrorMessage, householdApi } from '@/entities/household'
import { useHouseholdJoinStore } from '@/features/household-join'
import { notification } from '@/shared/services/notification'

// Dissolution confirm (household-ux 3.2, owner only): the destructive copy
// surfaces the local mirror's record counts (design risk D3), and the
// dissolving owner lands in the fresh personal household through the same
// clean start as leave (contributions cannot be carried).
const { t } = useI18n()
const join = useHouseholdJoinStore()
const transactionsRepository = useTransactionRepository()
const debtOperationsRepository = useDebtOperationRepository()
const plannedPaymentsRepository = usePlannedPaymentRepository()

const open = ref(false)
const dissolving = ref(false)
const countsText = ref('')

async function loadCounts(): Promise<void> {
  try {
    const [transactions, debtOperations, plans] = await Promise.all([
      transactionsRepository.query({}),
      debtOperationsRepository.getAll(),
      plannedPaymentsRepository.query({}),
    ])
    countsText.value = t('household.dissolveCounts', {
      transactions: t('household.counts.transactions', transactions.length),
      debtOperations: t('household.counts.debtOperations', debtOperations.length),
      plans: t('household.counts.plans', plans.length),
    })
  } catch {
    // Counts are copy, not a gate - dissolve proceeds without them.
    countsText.value = ''
  }
}

watch(open, (isOpen) => {
  if (isOpen) void loadCounts()
})

async function handleConfirm(): Promise<void> {
  dissolving.value = true
  try {
    await householdApi.dissolve()
    notification.success(t('household.dissolveSuccess'))
    open.value = false
    // The fresh personal household needs the same clean start as leave.
    const personalHousehold = await householdApi.getHousehold()
    await join.applyHouseholdChoice(personalHousehold, 'clean')
  } catch (error) {
    const mapped = getHouseholdErrorMessage(error)
    if (mapped) notification.error(mapped, { feature: 'household', action: 'dissolve' })
    else
      notification.mutationError(error, {
        title: t('household.dissolveTitle'),
        feature: 'household',
        action: 'dissolve',
      })
  } finally {
    dissolving.value = false
  }
}
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogTrigger as-child>
      <Button variant="destructive" data-testid="household-dissolve-button">
        {{ t('household.dissolve') }}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('household.dissolveTitle') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ t('household.dissolveDescription') }}
          <span v-if="countsText" class="block" data-testid="household-dissolve-counts">
            {{ countsText }}
          </span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel data-testid="household-dissolve-cancel">
          {{ t('household.cancel') }}
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          data-testid="household-dissolve-confirm"
          :loading="dissolving"
          @click="handleConfirm"
        >
          {{ t('household.dissolveConfirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
