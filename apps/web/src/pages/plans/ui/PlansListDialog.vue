<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Category } from '@expense-tracker/api'
import type { PlannedPayment } from '@/entities/planned-payment'
import {
  isPlanOverdue,
  nextDueLabel,
  planRowTitle,
  plansSortedByNextDue,
  utcTodayKey,
} from '../model/selectors'
import PlanFormDialog from './PlanFormDialog.vue'
import ConfirmPlanDialog from './ConfirmPlanDialog.vue'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { EmptyState } from '@/shared/ui/empty-state'
import { CheckCircle2 } from '@lucide/vue'
import { DEFAULT_CURRENCY, formatMoney } from '@/shared/lib/money'
import { useAuthorLabel } from '@/features/household-author'

// One type's plan list: flat next-due ascending (overdue first by
// construction), an overdue badge, a confirm action for manual plans, and
// row press to edit - the mobile list sheet as a web dialog (design D1).

const props = defineProps<{
  type: 'expense' | 'income'
  plans: readonly PlannedPayment[]
  categories: readonly Category[]
}>()

const open = defineModel<boolean>('open', { default: false })

const { t, locale } = useI18n()
const authorLabel = useAuthorLabel()
// Plans carry no currency of their own; the app display currency is fixed
// (currency-rub-only).
const displayCurrency = computed(() => DEFAULT_CURRENCY)

const title = computed(() =>
  props.type === 'expense' ? t('plans.expensesTitle') : t('plans.incomeTitle'),
)
const description = computed(() =>
  props.type === 'expense' ? t('plans.expensesDescription') : t('plans.incomeDescription'),
)
const addLabel = computed(() =>
  props.type === 'expense' ? t('plans.addExpense') : t('plans.addIncome'),
)

const today = computed(() => utcTodayKey())
const sorted = computed(() => plansSortedByNextDue(props.plans))

// Literal keys per branch (the i18n lint bans dynamic keys).
const regularityPhrases = computed<Record<PlannedPayment['regularity'], string>>(() => ({
  daily: t('plans.regularityPhrase.daily'),
  weekly: t('plans.regularityPhrase.weekly'),
  monthly: t('plans.regularityPhrase.monthly'),
  yearly: t('plans.regularityPhrase.yearly'),
}))

const subtitleOf = (plan: PlannedPayment) =>
  `${regularityPhrases.value[plan.regularity]} · ${nextDueLabel(plan.nextDue, locale.value)}`

// One dialog instance + active item refs (convention 4).
const formOpen = ref(false)
const activePlan = ref<PlannedPayment | null>(null)

const openCreate = () => {
  activePlan.value = null
  formOpen.value = true
}

const openEdit = (plan: PlannedPayment) => {
  activePlan.value = plan
  formOpen.value = true
}

const confirmOpen = ref(false)
const confirmPlan = ref<PlannedPayment | null>(null)

const openConfirm = (plan: PlannedPayment) => {
  confirmPlan.value = plan
  confirmOpen.value = true
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md" data-testid="plans-list-dialog">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <p class="text-sm text-muted-foreground">{{ description }}</p>
      </DialogHeader>

      <div class="max-h-80 overflow-y-auto">
        <EmptyState v-if="sorted.length === 0" :title="t('plans.empty')" />
        <ul v-else class="space-y-1">
          <li v-for="plan in sorted" :key="plan.id">
            <div
              class="flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-muted/70"
              :data-testid="`plans-row-${plan.id}`"
            >
              <button
                type="button"
                class="min-w-0 flex-1 text-left"
                @click="openEdit(plan)"
              >
                <p class="truncate text-sm font-medium">
                  {{ planRowTitle(plan, categories) }}
                </p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ subtitleOf(plan) }}
                  <span
                    v-if="authorLabel(plan.authorId)"
                    :data-testid="`plans-row-${plan.id}-author`"
                  >
                    · {{ authorLabel(plan.authorId) }}
                  </span>
                </p>
              </button>
              <Badge
                v-if="isPlanOverdue(plan, today)"
                variant="destructive"
                class="bg-destructive/15 text-destructive"
                :data-testid="`plans-row-${plan.id}-overdue`"
              >
                {{ t('plans.overdue') }}
              </Badge>
              <span class="text-sm font-medium">
                {{ formatMoney(plan.amount, displayCurrency, locale) }}
              </span>
              <Button
                v-if="plan.confirmMode === 'manual'"
                variant="ghost"
                size="icon"
                class="size-8"
                :aria-label="`${t('plans.confirmTitle')}: ${planRowTitle(plan, categories)}`"
                :data-testid="`plans-row-${plan.id}-confirm`"
                @click="openConfirm(plan)"
              >
                <CheckCircle2 class="size-4" />
              </Button>
            </div>
          </li>
        </ul>
      </div>

      <DialogFooter>
        <Button class="w-full" data-testid="plans-list-add" @click="openCreate">
          {{ addLabel }}
        </Button>
      </DialogFooter>

      <PlanFormDialog
        v-if="formOpen"
        :key="activePlan?.id ?? 'create'"
        v-model:open="formOpen"
        :type="type"
        :plan="activePlan"
      />

      <ConfirmPlanDialog
        v-if="confirmOpen && confirmPlan"
        :key="confirmPlan.id"
        v-model:open="confirmOpen"
        :plan="confirmPlan"
        :categories="categories"
      />
    </DialogContent>
  </Dialog>
</template>
