<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { ArrowLeftRight, Minus, Plus, X } from '@lucide/vue'
import { CashflowForm, TransferForm } from '@/features/transaction/add'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'

// Header-row close button shared by both quick-action dialogs (specimen:
// the X lives in the bordered header line, aligned with the title).
const closeClasses =
  'rounded-xs text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:outline-hidden'

// Quick actions aligned with the mobile home (web-screens-parity design D5):
// expense / transfer entries open web dialogs; the income entry links to the
// quick income page (/income).

const { t } = useI18n()

const expenseOpen = ref(false)
const transferOpen = ref(false)
</script>

<template>
  <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
    <Dialog v-model:open="expenseOpen">
      <DialogTrigger as-child>
        <Button
          variant="outline"
          class="h-11 justify-start gap-3"
          data-testid="quick-action-expense"
        >
          <span
            class="flex size-8 items-center justify-center rounded-full bg-warning/10 text-warning"
            aria-hidden="true"
          >
            <Minus class="size-4" />
          </span>
          {{ t('dashboard.quickActions.expense') }}
        </Button>
      </DialogTrigger>
      <DialogContent class="sm:max-w-[400px]" :show-close-button="false">
        <DialogHeader class="-mx-6 -mt-6 flex-row items-center justify-between border-b px-6 pb-4 pt-6">
          <DialogTitle>{{ t('analytics.expenses') }}</DialogTitle>
          <DialogClose :class="closeClasses">
            <X class="size-5" />
            <span class="sr-only">{{ t('common.close') }}</span>
          </DialogClose>
        </DialogHeader>
        <CashflowForm type="expense" cancellable @success="expenseOpen = false" />
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="transferOpen">
      <DialogTrigger as-child>
        <Button
          variant="outline"
          class="h-11 justify-start gap-3"
          data-testid="quick-action-transfer"
        >
          <span
            class="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <ArrowLeftRight class="size-4" />
          </span>
          {{ t('dashboard.quickActions.transfer') }}
        </Button>
      </DialogTrigger>
      <DialogContent class="sm:max-w-[400px]" :show-close-button="false">
        <DialogHeader class="-mx-6 -mt-6 flex-row items-center justify-between border-b px-6 pb-4 pt-6">
          <DialogTitle>{{ t('addTransfer.submit') }}</DialogTitle>
          <DialogClose :class="closeClasses">
            <X class="size-5" />
            <span class="sr-only">{{ t('common.close') }}</span>
          </DialogClose>
        </DialogHeader>
        <TransferForm cancellable @success="transferOpen = false" />
      </DialogContent>
    </Dialog>

    <Button
      as-child
      variant="outline"
      class="h-11 justify-start gap-3 rounded-xl"
      data-testid="quick-action-income"
    >
      <RouterLink to="/income">
        <span
          class="flex size-8 items-center justify-center rounded-full bg-success/10 text-success"
          aria-hidden="true"
        >
          <Plus class="size-4" />
        </span>
        {{ t('dashboard.quickActions.income') }}
      </RouterLink>
    </Button>
  </div>
</template>
