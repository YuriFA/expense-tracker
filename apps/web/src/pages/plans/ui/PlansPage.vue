<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlannedPayments } from '@/entities/planned-payment'
import { useCategories } from '@/entities/category'
import PlansTypeCard from './PlansTypeCard.vue'
import PlansListDialog from './PlansListDialog.vue'
import { ErrorState } from '@/shared/ui/error-state'
import { Skeleton } from '@/shared/ui/skeleton'

// Plans screen (planned-payments capability): two type cards (count +
// normalized monthly figure); opening a type shows its plan list with the
// confirm flow. One `usePlannedPayments` read - figures derive in memory.

const { t } = useI18n()

const {
  data: plans,
  isLoading,
  error,
  refetch,
} = usePlannedPayments()
const { data: categories } = useCategories()

const expensePlans = computed(() => (plans.value ?? []).filter((plan) => plan.type === 'expense'))
const incomePlans = computed(() => (plans.value ?? []).filter((plan) => plan.type === 'income'))

// One dialog instance + active type ref (convention 4).
const listOpen = ref(false)
const activeType = ref<'expense' | 'income'>('expense')

const openList = (type: 'expense' | 'income') => {
  activeType.value = type
  listOpen.value = true
}
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold">{{ t('pages.plans') }}</h1>

    <div v-if="isLoading" class="mt-6 grid gap-4 md:grid-cols-2">
      <Skeleton class="h-32 rounded-xl" />
      <Skeleton class="h-32 rounded-xl" />
    </div>
    <div v-else-if="error" class="mt-6">
      <ErrorState @retry="refetch" />
    </div>
    <div v-else class="mt-6 grid gap-4 md:grid-cols-2">
      <PlansTypeCard type="expense" :plans="expensePlans" @open-list="openList" />
      <PlansTypeCard type="income" :plans="incomePlans" @open-list="openList" />
    </div>

    <PlansListDialog
      v-if="listOpen"
      :key="activeType"
      v-model:open="listOpen"
      :type="activeType"
      :plans="activeType === 'expense' ? expensePlans : incomePlans"
      :categories="categories ?? []"
    />
  </section>
</template>
