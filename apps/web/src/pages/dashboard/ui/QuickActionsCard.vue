<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { ArrowDown, ArrowUp, Minus } from '@lucide/vue'
import { CashflowForm, TransferForm } from '@/features/transaction/add'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'

// Quick actions aligned with the mobile home (web-screens-parity design D5):
// expense / transfer entries open web dialogs; the income entry links to the
// quick income page (/income).

const { t } = useI18n()

const expenseOpen = ref(false)
const transferOpen = ref(false)
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-muted-foreground">{{ t('dashboard.quickActions.title') }}</CardTitle>
    </CardHeader>

    <CardContent class="flex flex-col gap-2">
      <Dialog v-model:open="expenseOpen">
        <DialogTrigger as-child>
          <Button variant="outline" class="justify-start" data-testid="quick-action-expense">
            <span class="flex size-8 items-center justify-center rounded-lg bg-destructive/15" aria-hidden="true">
              <Minus class="size-4" />
            </span>
            {{ t('dashboard.quickActions.expense') }}
          </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{{ t('analytics.expenses') }}</DialogTitle>
          </DialogHeader>
          <CashflowForm type="expense" @success="expenseOpen = false" />
        </DialogContent>
      </Dialog>

      <Dialog v-model:open="transferOpen">
        <DialogTrigger as-child>
          <Button variant="outline" class="justify-start" data-testid="quick-action-transfer">
            <span class="flex size-8 items-center justify-center rounded-lg bg-[var(--primary)]/15" aria-hidden="true">
              <ArrowUp class="size-4" />
            </span>
            {{ t('dashboard.quickActions.transfer') }}
          </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{{ t('addTransfer.submit') }}</DialogTitle>
          </DialogHeader>
          <TransferForm @success="transferOpen = false" />
        </DialogContent>
      </Dialog>

      <Button as-child variant="outline" class="justify-start" data-testid="quick-action-income">
        <RouterLink to="/income" class="flex items-center gap-0">
          <span class="flex size-8 items-center justify-center rounded-lg bg-[var(--success)]/15" aria-hidden="true">
            <ArrowDown class="size-4" />
          </span>
          {{ t('dashboard.quickActions.income') }}
        </RouterLink>
      </Button>
    </CardContent>
  </Card>
</template>
