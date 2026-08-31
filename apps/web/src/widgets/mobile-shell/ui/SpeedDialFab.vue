<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { ArrowLeftRight, Minus, Plus, X } from '@lucide/vue'
import { CashflowForm, TransferForm } from '@/features/transaction/add'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

// RN-parity add entry (web-screens: mobile navigation shell): the FAB never
// navigates; each speed-dial action opens its creation dialog directly -
// one dialog per kind mounted once, same as the dashboard quick actions.
const { t } = useI18n()

const open = ref(false)
const expenseOpen = ref(false)
const transferOpen = ref(false)
const incomeOpen = ref(false)

// The tab bar stays tappable while the dial is open (canvas round-3), so any
// navigation must dismiss the transient dial. Justified watch: there is no
// parent that could pass an event between the two sibling shell widgets.
const route = useRoute()
watch(
  () => route.fullPath,
  () => {
    open.value = false
  },
)

// Header-row close button shared by all dialogs (specimen: QuickActionsCard).
const closeClasses =
  'rounded-xs text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:outline-hidden'

function openExpense() {
  open.value = false
  expenseOpen.value = true
}
function openTransfer() {
  open.value = false
  transferOpen.value = true
}
function openIncome() {
  open.value = false
  incomeOpen.value = true
}
</script>

<template>
  <div>
    <!-- Scrim: a uniform page-colored wash keeps the content readable in both
         themes (the token is warm paper in light, near-black in dark), the
         bottom layers emphasize the dial area (canvas round-3) - gradient +
         blur that fades out towards the top via a mask (uniform backdrop blur
         would blank the whole screen). Only the wash layer is tappable. -->
    <div
      v-if="open"
      data-testid="speed-dial-scrim"
      class="fixed inset-0 z-30 bg-background/40"
      @click="open = false"
    />
    <div
      v-if="open"
      aria-hidden="true"
      class="pointer-events-none fixed inset-0 z-30 bg-gradient-to-t from-background/80 via-background/30 to-transparent"
    />
    <div
      v-if="open"
      aria-hidden="true"
      class="pointer-events-none fixed inset-0 z-30 backdrop-blur-md [mask-image:linear-gradient(to_top,black_0%,rgba(0,0,0,0.6)_35%,transparent_70%)]"
    />

    <div class="pointer-events-auto relative z-50 -mb-10 flex size-14 items-center justify-center">
      <div
        v-if="open"
        class="absolute bottom-full left-1/2 z-40 mb-3 flex -translate-x-1/2 items-center gap-7"
      >
        <div class="flex flex-col items-center gap-2">
          <!-- Solid card underlay: without it the 10% tint stacks on the scrim
               wash and the tiles melt into the background. -->
          <button
            class="flex size-14 items-center justify-center rounded-full bg-card"
            data-testid="speed-dial-transfer"
            @click="openTransfer"
          >
            <span class="flex size-full items-center justify-center rounded-full bg-primary/10">
              <ArrowLeftRight class="size-5 text-primary" aria-hidden="true" />
            </span>
          </button>
          <span class="text-[11px] font-medium text-foreground">{{ t('shell.transfer') }}</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <button
            class="flex size-20 items-center justify-center rounded-full bg-card"
            data-testid="speed-dial-expense"
            @click="openExpense"
          >
            <span class="flex size-full items-center justify-center rounded-full bg-warning/10">
              <Minus class="size-8 text-warning" aria-hidden="true" />
            </span>
          </button>
          <span class="text-[11px] font-medium text-foreground">{{ t('shell.expense') }}</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <button
            class="flex size-14 items-center justify-center rounded-full bg-card"
            data-testid="speed-dial-income"
            @click="openIncome"
          >
            <span class="flex size-full items-center justify-center rounded-full bg-success/10">
              <Plus class="size-5 text-success" aria-hidden="true" />
            </span>
          </button>
          <span class="text-[11px] font-medium text-foreground">{{ t('shell.income') }}</span>
        </div>
      </div>

      <button
        class="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_12px_4px_rgba(0,0,0,0.12)]"
        :aria-expanded="open"
        :aria-label="t('dashboard.addOperation')"
        data-testid="fab-add-operation"
        @click="open = !open"
      >
        <Plus class="size-6 transition-transform" :class="open && 'rotate-45'" aria-hidden="true" />
      </button>
    </div>

    <Dialog v-model:open="expenseOpen">
      <DialogContent class="sm:max-w-[400px]" :show-close-button="false">
        <DialogHeader class="-mx-6 -mt-6 flex-row items-center justify-between border-b px-6 pb-4 pt-6">
          <DialogTitle>{{ t('analytics.expenses') }}</DialogTitle>
          <DialogClose :class="closeClasses">
            <X class="size-5" />
            <span class="sr-only">{{ t('common.close') }}</span>
          </DialogClose>
        </DialogHeader>
        <CashflowForm type="expense" @success="expenseOpen = false" />
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="transferOpen">
      <DialogContent class="sm:max-w-[400px]" :show-close-button="false">
        <DialogHeader class="-mx-6 -mt-6 flex-row items-center justify-between border-b px-6 pb-4 pt-6">
          <DialogTitle>{{ t('addTransfer.submit') }}</DialogTitle>
          <DialogClose :class="closeClasses">
            <X class="size-5" />
            <span class="sr-only">{{ t('common.close') }}</span>
          </DialogClose>
        </DialogHeader>
        <TransferForm @success="transferOpen = false" />
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="incomeOpen">
      <DialogContent class="sm:max-w-[400px]" :show-close-button="false">
        <DialogHeader class="-mx-6 -mt-6 flex-row items-center justify-between border-b px-6 pb-4 pt-6">
          <DialogTitle>{{ t('shell.income') }}</DialogTitle>
          <DialogClose :class="closeClasses">
            <X class="size-5" />
            <span class="sr-only">{{ t('common.close') }}</span>
          </DialogClose>
        </DialogHeader>
        <CashflowForm type="income" @success="incomeOpen = false" />
      </DialogContent>
    </Dialog>
  </div>
</template>
